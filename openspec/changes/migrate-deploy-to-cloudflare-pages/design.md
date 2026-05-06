## Context

The site deploys today via GitHub Pages (`actions/deploy-pages`); CNAME → `artagon.com`. CSP ships only as `<meta http-equiv>` baked into HTML by `scripts/csp.mjs` postbuild — no HTTP response headers.

USMR's `update-site-marketing-redesign` plans a `public/_redirects` file (Cloudflare Pages / Netlify format). GitHub Pages does NOT support `_redirects` natively. So either USMR is forever blocked OR the host migrates. This change is the migration.

The host migration is mostly mechanical — same `dist/` directory, different deploy action — but the security architecture deserves explicit design. Specifically:

1. CSP now lives in TWO places (HTTP header + `<meta>` tag); they MUST agree, enforced by a build gate.
2. Browser security headers (HSTS, COOP/COEP, Permissions-Policy, Referrer-Policy) become a per-route configuration via `_headers`.
3. Edge cache rules (`Cache-Control` per file class) ship as headers, not as HTML hints.
4. The DNS cutover has a rollback procedure that doesn't require a code change.
5. Both GH Pages and Cloudflare Pages workflows run in parallel during the cutover window so content parity is verifiable before DNS flips.

## Goals / Non-Goals

**Goals:**

- Migrate live site from GitHub Pages to Cloudflare Pages with zero downtime.
- Ship HTTP security headers (HSTS, CSP, COOP, COEP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options) as response headers, not just `<meta>` tags.
- Enable USMR's `_redirects` file (case-insensitive `/bridge` → `/platform` 301) by hosting on a platform that supports it.
- Tighten edge-cache rules: `immutable` for hashed assets, `must-revalidate` for HTML.
- Make the CSP single-source: `scripts/csp.mjs` emits both `<meta>` content AND `_headers` body. Drift fails the build.
- Keep both deploy workflows parallel until cutover is verified stable for ≥ 7 days; then archive GH Pages via a separate change.

**Non-Goals:**

- Cloudflare Workers / Functions / Edge Functions / R2.
- Cloudflare Turnstile / WAF custom rules / bot management beyond the default Medium security level.
- Cloudflare Analytics / Web Analytics opt-in. (Deferred to a privacy-aware follow-up.)
- Multi-region or multi-account redundancy.
- Migrating CSP from `<meta>` to header-only. The `<meta>` tag stays as belt-and-braces redundancy.
- Self-hosting WOFF2 fonts (separate change `self-host-woff2-fonts`).

## Decisions

### D1: Cloudflare Pages, not Workers

Cloudflare Pages is the right product for a pure-static Astro site. Pages: static deploy, edge caching, anycast, free TLS, custom domain support, `_headers` + `_redirects` parsing, free unmetered bandwidth. Workers: server-side runtime, paid above 100K req/day, complexity we don't need.

**Alternative considered:** Netlify. Rejected — Cloudflare's anycast network is broader, free tier more generous, and Cloudflare's HSTS preload + edge-cache control are slightly better integrated.

**Alternative considered:** Vercel. Rejected — Vercel's "edge function" + ISR features are wasted on pure-static; bandwidth tier is more restrictive.

### D2: `_headers` + `_redirects` as the contract surface

Both files live under `public/` and ship verbatim with `dist/`. Cloudflare Pages parses them at deploy time. Both files are version-controlled; PR review covers them like any other source.

`_headers` syntax is path-prefix matching with header overrides. `_redirects` syntax is per-line `<from> <to> <status>`. Both are documented Cloudflare Pages format; identical to Netlify.

**Alternative considered:** Cloudflare Pages' `wrangler.toml` config + Cloudflare Functions for header injection. Rejected — Functions adds a runtime layer; `_headers` is plain text and easier to review.

### D3: CSP single-source via `scripts/csp.mjs`

`scripts/csp.mjs` today emits the `<meta http-equiv="Content-Security-Policy">` tag into every built HTML. Extension: same script ALSO writes `public/_headers` body for the CSP `Content-Security-Policy` header line. The `<meta>` and the header MUST be byte-identical (same directives in same order). Build gate `scripts/verify-headers.mjs` re-parses both and fails if they diverge.

```js
// scripts/csp.mjs (extended) emits both:
//   1. <meta http-equiv="Content-Security-Policy" content="..."> in dist/**/*.html
//   2. public/_headers entry:
//        /*
//          Content-Security-Policy: default-src 'self'; ...
//          (other security headers)
```

The `<meta>` stays even after the header lands. Two reasons:

1. Belt-and-braces redundancy if the host fails to honor the header.
2. Browsers honor the strictest of the two — so dual-source can only be safer, not more permissive.

**Alternative considered:** drop the `<meta>` tag, header-only. Rejected — meta tag remains a no-cost safety net.

**Alternative considered:** generate `_headers` from a YAML source-of-truth, distinct from `csp.mjs`. Rejected — drift between two CSP sources is exactly the bug class this change prevents.

### D4: Header set per file class

```
# public/_headers (generated by scripts/csp.mjs)

/*
  Content-Security-Policy: <full directives>
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
  Vary: Accept-Encoding

/sitemap-index.xml
  Cache-Control: public, max-age=3600

/sitemap-0.xml
  Cache-Control: public, max-age=3600

/robots.txt
  Cache-Control: public, max-age=3600
```

The `/* ` block applies security headers globally. File-class blocks override `Cache-Control` for hashed assets vs HTML. Cloudflare Pages parses these top-down; later blocks override earlier ones for the same path.

**Alternative considered:** `Cross-Origin-Embedder-Policy: require-corp`. Rejected for v1 — `require-corp` would force every cross-origin resource to send `Cross-Origin-Resource-Policy` headers; we don't need cross-origin isolation today and forcing it would break any future third-party embed (e.g., a YouTube tutorial in `/writing/*`). Use `credentialless` instead — the weaker variant that lets us opt into cross-origin-isolated APIs (SharedArrayBuffer, performance.now()) if a future feature needs them, without requiring upstream cooperation.

**Alternative considered:** HSTS `max-age=31536000` (1 year). Rejected — `max-age=63072000` (2 years) is the HSTS preload list requirement (`includeSubDomains; preload`); the longer max-age is a hard requirement for inclusion in the Chromium preload list.

### D5: Wrangler-based deploy action

`.github/workflows/deploy.yml` rewritten to use `cloudflare/wrangler-action@<SHA-pinned>`. Auth via `secrets.CLOUDFLARE_API_TOKEN` (Cloudflare API token scoped to `Account.Cloudflare Pages:Edit` on the `artagon` project ONLY — never account-wide). Deploy command: `wrangler pages deploy ./.build/dist --project-name=artagon --branch=main`.

**Alternative considered:** Cloudflare Pages' built-in GitHub integration (auto-deploy via Cloudflare's webhook). Rejected — this would bypass GitHub Actions entirely, removing PR-based preview deploys, build logging, and audit trail. The wrangler-action approach keeps the deploy in CI where it belongs.

**Alternative considered:** OIDC token instead of API token. Rejected for v1 — Cloudflare's OIDC support is newer; API token + scoped permissions is the documented path. Migrate to OIDC in a follow-up if Cloudflare's OIDC matures.

### D6: PR preview deploys

NEW `.github/workflows/deploy-cloudflare-pages-preview.yml`: on every PR, deploys to a Cloudflare Pages preview URL (`<branch-slug>.artagon.pages.dev`). Posts the preview URL as a PR comment. Lets reviewers click through to verify content before merge.

Preview URL is per-branch (auto-cleaned by Cloudflare on branch deletion). No DNS cutover needed for preview URLs.

**Alternative considered:** preview deploy on `push` only (not PR). Rejected — the value of preview is the click-through review surface; PR-triggered is correct.

### D7: DNS cutover playbook

Cutover is a manual sequence captured in `docs/deploy.md`:

1. Deploy to Cloudflare Pages production via `workflow_dispatch` of the new `deploy.yml`. Verify content at the auto-assigned `artagon.pages.dev` URL.
2. Add `artagon.com` as a custom domain in the Cloudflare Pages project. Cloudflare provides the CNAME target.
3. At the DNS registrar: drop CNAME TTL to 5 minutes (let cache age out).
4. Wait 1 hour for DNS cache TTL to expire globally.
5. Update CNAME to point at the Cloudflare-provided target. Both old (GH Pages) and new (Cloudflare Pages) targets continue serving the same content because `main` deploys to BOTH workflows in parallel.
6. Watch CDN error rates + SSL handshake metrics for 24 hours. If anomalous: revert CNAME (rollback). Both deploy targets are still serving identical content; reverting DNS is a 5-minute fix.
7. After 7 days of green operation: open follow-up OpenSpec change `archive-github-pages-deployment` to remove the GH Pages workflow.

**Alternative considered:** big-bang DNS cut with no parallel deploy. Rejected — without parallel deploy, rollback requires re-deploying via the old workflow, which adds 5+ minutes to a recovery procedure.

### D8: Origin lockdown

Cloudflare Pages serves from `<project>.pages.dev` AND any custom domain CNAMEd to it. The pages.dev URL is publicly accessible; we cannot prevent direct access. Mitigations:

1. **Always Use HTTPS** rule (Cloudflare Page Rules): redirects `http://` → `https://` for both pages.dev and custom domain.
2. **Minimum TLS 1.2** (Cloudflare SSL/TLS settings): rejects clients negotiating older TLS.
3. **Disable Auto-Minify** (Cloudflare Speed settings): would mutate HTML and break SRI hashes.
4. **HSTS preload** via `Strict-Transport-Security` header (D4) eventually lands `artagon.com` on the Chromium HSTS preload list, removing the first-request HTTP downgrade window.
5. **No bot challenge** for v1 — would block Lighthouse + Playwright + crawlers we want.

**Alternative considered:** Cloudflare Access (zero-trust auth) on the pages.dev URL. Rejected — overkill for a public marketing site.

### D9: Content parity verification before DNS cut

`scripts/verify-content-parity.mjs` (NEW): given two URLs (the GH Pages canonical + the Cloudflare Pages preview), fetches both, compares HTML body byte-for-byte (excluding env-specific headers + dynamic elements like timestamps). Run manually as part of the cutover playbook. Exit non-zero if any path's content differs.

**Alternative considered:** trust that "same dist/" = "same content." Rejected — host-side content rewrites (e.g., GH Pages historically injected analytics; Cloudflare may inject Web Analytics if accidentally enabled) can introduce drift the local build can't see.

## Risks / Trade-offs

| Risk                                                                                                                          | Mitigation                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CSP-as-header behaves differently from CSP-as-meta in edge cases (e.g., `frame-ancestors` only works as a header, not a meta) | The `<meta>` keeps the policy mirror; the header is the primary enforcement. `verify-headers.mjs` ensures the two stay in sync.                                                                  |
| Cloudflare's auto-minify accidentally enabled, breaking SRI hashes                                                            | Hard-disable in the project settings via `wrangler pages project create` flags. Document in `docs/deploy.md` cutover step 1.                                                                     |
| Cloudflare API token leaked or over-scoped                                                                                    | Token scoped to single project + `Cloudflare Pages:Edit` only. Rotated quarterly via Dependabot-style reminder. CODEOWNERS dual-review on `secrets.CLOUDFLARE_API_TOKEN` references.             |
| DNS cutover during a high-traffic window causes a partial outage                                                              | Schedule cutover during a low-traffic window (UTC 06:00 weekday). `docs/deploy.md` lists the lookup table of low-traffic windows derived from prior Lighthouse run timings.                      |
| HSTS preload `max-age=2years` locks us in — once the apex is in the preload list, removal takes 12+ months                    | Preload is opt-in: we don't submit to https://hstspreload.org until 60 days post-cutover. The `preload` token in the header is a _willingness signal_; submission is a separate action.          |
| `_headers` and `_redirects` syntax differences vs. Netlify                                                                    | Cloudflare's parser is documented separately from Netlify's. We test both files against Cloudflare's CLI validator (`wrangler pages dev`) in CI.                                                 |
| Per-PR preview deploys leak draft content                                                                                     | Cloudflare Pages preview URLs are not robots-indexed by default; preview deploys serve `X-Robots-Tag: noindex` header (added to `_headers` for the preview environment).                         |
| Workflow secret `CLOUDFLARE_API_TOKEN` accidentally committed to repo                                                         | `gitleaks` pre-commit hook + GitHub's secret scanning rejects on push. Already enabled on the org.                                                                                               |
| Existing CSP exception for `cdn.jsdelivr.net` (Algolia DocSearch on `/search`) needs to round-trip into the header            | `csp.mjs` already encodes the exception; extending the script to emit `_headers` reuses the same data structure. No new code path.                                                               |
| `_redirects` collision between this change and `update-site-marketing-redesign`                                               | USMR Phase 7.4 + 10.5 are the source of truth for redirect entries; this change provides only the host that supports them. Coordination via PR comments + cross-reference in tasks.md Phase 7.6. |

## Migration Plan

The change applies in 7 phases over ~2 weeks total wall time. Cutover is the only manual step.

1. **Phase 0 — Pre-flight (1 day):** create Cloudflare account + project; generate scoped API token; record account ID; run `wrangler pages project create artagon` + verify project healthy.
2. **Phase 1 — Build `_headers` + `_redirects` generators (3 days):** extend `scripts/csp.mjs`; add `scripts/verify-headers.mjs`; Vitest tests.
3. **Phase 2 — Cloudflare Pages deploy workflow (1 day):** new `.github/workflows/deploy.yml` (rewritten) + `deploy-cloudflare-pages-preview.yml` (new). PR-trigger preview deploys land here.
4. **Phase 3 — Verify content parity locally (1 day):** `scripts/verify-content-parity.mjs`. Run against GH Pages canonical + Cloudflare preview.
5. **Phase 4 — Document cutover playbook (1 day):** `docs/deploy.md` with the 7-step procedure + rollback.
6. **Phase 5 — Cutover (manual, 1 hour active):** follow `docs/deploy.md`. Both workflows continue running on `main`.
7. **Phase 6 — Soak (7 days passive):** monitor Cloudflare error rates + Lighthouse scores. No code changes.
8. **Phase 7 — Archive (1 hour after soak):** open follow-up OpenSpec change `archive-github-pages-deployment` to remove `actions/deploy-pages` workflow + the redundant deploy step.

**Rollback strategy:** at any point in Phase 5-7, revert the CNAME at the registrar. Both workflows continue depositing identical content; both targets serve. Recovery is DNS-only, no code change required. `docs/deploy.md` documents this explicitly.

## Open Questions

1. **Whether to enable Cloudflare Web Analytics during this change.** Decision: NO. Privacy-policy + EU consent surface deserve their own design. Track separately.
2. **Whether `_redirects` for case-insensitive `/bridge` needs `301!` (the bang variant for "always redirect, even if a file matches")**. Cloudflare's `_redirects` syntax: `301` is the default (always); `301!` is the same; the bang variant is Netlify-specific. Decision: use `301` plain.
3. **Whether to ship a `humans.txt` + `security.txt` at the same time** (both opportunistic; Cloudflare serves them like any other static file). Decision: out of scope for this change; track in a follow-up `add-discovery-files` change if desired.
4. **HTTP/3 enablement** — Cloudflare default. Decision: leave default ON.
5. **Brotli compression** — Cloudflare default. Decision: leave default ON.
