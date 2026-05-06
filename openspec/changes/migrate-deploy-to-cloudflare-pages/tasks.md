## 0. Phase 0 — Pre-flight (Cloudflare account setup)

- [ ] 0.1 Run `openspec validate --strict migrate-deploy-to-cloudflare-pages`. Acceptance: validation reports valid.
- [ ] 0.2 Create or identify the Cloudflare account that will own the `artagon` Pages project. Document the account ID in a secure password manager (NOT committed to repo). Files: none committed. Acceptance: account ID recorded; maintainer can run `wrangler whoami` and see the right account.
- [ ] 0.3 Generate a scoped API token via the Cloudflare dashboard: `Account.Cloudflare Pages:Edit` for the `artagon` project ONLY. Document token rotation policy (quarterly). Files: none committed. Acceptance: token validates against Cloudflare's API; permissions inspection shows project-scoped only.
- [ ] 0.4 Add `secrets.CLOUDFLARE_API_TOKEN` and `secrets.CLOUDFLARE_ACCOUNT_ID` to GitHub repo secrets via `gh secret set`. Files: none committed. Acceptance: `gh secret list` shows both.
- [ ] 0.5 Create the Cloudflare Pages project: `wrangler pages project create artagon`. Disable Auto-Minify in project settings. Files: none committed. Acceptance: `wrangler pages project list` shows `artagon` project.

## 1. Phase 1 — Build the headers + redirects pipeline

- [ ] 1.1 Extend `scripts/csp.mjs` to ALSO emit `public/_headers` body alongside the existing `<meta>`-tag injection. The script writes `_headers` directly under `public/`. Files: `scripts/csp.mjs`, `public/_headers` (NEW). Acceptance: `node scripts/csp.mjs` produces a `public/_headers` with the global `/*` block + per-class blocks.
- [ ] 1.2 Build `scripts/verify-headers.mjs`: parse `public/_headers`, compare CSP value to the `<meta>` value emitted into `dist/index.html`, verify presence of the 7 required security headers, verify HSTS `max-age` ≥ 31536000. Exit codes 0/1/2 per the existing verify-script convention. Files: `scripts/verify-headers.mjs`. Acceptance: against the Phase 1.1 output, gate exits 0; manually mutating `_headers` to drift the CSP flips to non-zero.
- [ ] 1.3 Add Vitest tests: `tests/unit/csp-headers-emission.test.ts` (verifies `csp.mjs` writes `_headers` correctly), `tests/unit/verify-headers.test.ts` (verifies the gate). Files: 2 new test files. Acceptance: ≥ 12 tests pass covering happy path + each violation type.
- [ ] 1.4 Add npm scripts: `verify:headers` → `node scripts/verify-headers.mjs`. Files: `package.json`. Acceptance: `npm run verify:headers` invocable.
- [ ] 1.5 Wire `verify:headers` into `postbuild` after `csp.mjs`. Files: `package.json`. Acceptance: `npm run postbuild` chain runs csp.mjs → verify:headers as adjacent steps.

## 2. Phase 2 — Cloudflare Pages deploy workflow

- [ ] 2.1 Rename existing `.github/workflows/deploy.yml` → `.github/workflows/deploy-github-pages.yml` (preserve content verbatim; this is the SOAK-window GH Pages workflow). Files: workflow renamed. Acceptance: `git log --follow` shows the rename; existing GH Pages deploy continues to work.
- [ ] 2.2 Create new `.github/workflows/deploy.yml` for Cloudflare Pages. Use `cloudflare/wrangler-action@<SHA-pinned>` with `command: pages deploy ./.build/dist --project-name=artagon --branch=main`. Auth via `secrets.CLOUDFLARE_API_TOKEN` + `secrets.CLOUDFLARE_ACCOUNT_ID`. Trigger: push to main + workflow_dispatch. Files: `.github/workflows/deploy.yml`. Acceptance: workflow YAML lints clean; `wrangler-action` SHA is the latest pinned release.
- [ ] 2.3 Create `.github/workflows/deploy-cloudflare-pages-preview.yml` for PR preview deploys. Trigger: `pull_request` on opened/synchronize. Deploy to `<branch-slug>.artagon.pages.dev`. Post the preview URL as a PR comment via `actions/github-script`. Files: new workflow. Acceptance: workflow runs on PR open; comment lands.
- [ ] 2.4 Configure the preview environment to emit `X-Robots-Tag: noindex, nofollow` via a separate `_headers` block scoped to preview hosts. Files: `public/_headers` (additional block under `# Preview-environment-only`). Acceptance: a fetch against any `*.artagon.pages.dev` shows the noindex header.

## 3. Phase 3 — Build the content-parity check

- [ ] 3.1 Build `scripts/verify-content-parity.mjs`: accepts two URLs as args; walks `src/pages/**/*.astro` to enumerate routes; fetches each path against both URLs; normalizes response bodies (strip `<meta http-equiv="X-Pingback">`, dynamic timestamps, env-specific headers); computes SHA-256 hash per response; exits non-zero on any path whose hashes differ. Files: `scripts/verify-content-parity.mjs`. Acceptance: against two identical static deploys, exits 0; injecting a `<script>` into one of them flips to non-zero.
- [ ] 3.2 Add Vitest tests: `tests/unit/verify-content-parity.test.ts`. Use a tiny HTTP fixture server (Node's `node:http`) to serve known content. Files: new test file. Acceptance: ≥ 6 tests covering happy path + drift detection + normalization edge cases.
- [ ] 3.3 Add npm script: `verify:content-parity` → `node scripts/verify-content-parity.mjs`. Files: `package.json`. Acceptance: invocable; `--help` flag prints usage.

## 4. Phase 4 — Document the cutover playbook

- [ ] 4.1 Write `docs/deploy.md`: 7-step cutover playbook (account verification, TTL drop, parallel-deploy guarantee, DNS swap, monitoring window, rollback procedure, archive trigger). Include the lookup table of low-traffic windows. Files: `docs/deploy.md`. Acceptance: document is greppable for "rollback" and contains a labeled section.
- [ ] 4.2 Update `AGENTS.md` deployment section: cite `docs/deploy.md` as the source of truth; remove obsolete GH Pages-only language; add a "Production deploy target: Cloudflare Pages" line. Files: `AGENTS.md`. Acceptance: any agent reading AGENTS.md gets the right deploy context.
- [ ] 4.3 Update `README.md` Deployment section if present. Files: `README.md`. Acceptance: README reflects current deploy target.

## 5. Phase 5 — Cutover (manual, executed by maintainer)

> NOTE: tasks 5.1-5.7 are MANUAL operational steps. They are NOT runnable in CI; they are checklist items the maintainer ticks during the actual cutover.

- [ ] 5.1 Trigger `workflow_dispatch` of new `deploy.yml` (Cloudflare Pages). Verify content at `artagon.pages.dev` URL.
- [ ] 5.2 Run `npm run verify:content-parity -- https://artagon.com https://main.artagon.pages.dev`. Acceptance: 0 drift across all routes.
- [ ] 5.3 Add `artagon.com` as a custom domain in the Cloudflare Pages project. Cloudflare provides the CNAME target.
- [ ] 5.4 At the registrar: drop CNAME TTL to 5 minutes. Wait 1 hour for DNS cache TTL to expire globally.
- [ ] 5.5 Update CNAME to the Cloudflare-provided target. Verify propagation via `dig artagon.com CNAME` from multiple geographies.
- [ ] 5.6 Watch CDN error rates + SSL handshake metrics for 24 hours (Cloudflare dashboard). Acceptance: error rate < 0.1%; no SSL handshake failures.
- [ ] 5.7 If anomalous: revert CNAME at the registrar (rollback). Both deploy targets continue serving identical content via the parallel-deploy invariant; recovery time ≤ 5 minutes.

## 6. Phase 6 — Soak (7 days passive)

- [ ] 6.1 Monitor Cloudflare error rates + Lighthouse scores for ≥ 7 days. Files: none committed (operational). Acceptance: Lighthouse perf ≥ pre-cutover baseline; CWV (LCP, CLS, INP) ≥ pre-cutover baseline.
- [ ] 6.2 Verify HSTS preload eligibility at https://hstspreload.org (do NOT submit yet — wait until 60 days post-cutover). Files: none. Acceptance: site is "preload-eligible" per the checker.

## 7. Phase 7 — Wire into in-flight changes + verification

- [ ] 7.1 Coordinate with `update-site-marketing-redesign`: USMR Phase 7.4 + 10.5 (the `/bridge` redirect entries) are now actionable. Cross-reference in this change's PR description that USMR Phase 7.4 + 10.5 unblock once this change archives. Files: PR description. Acceptance: cross-ref documented.
- [ ] 7.2 Run full local gate sweep: `npm run typecheck && npm run build && npm run postbuild && npm test && npm run lint:sg:ci`. Acceptance: all exit zero; postbuild chain includes `csp.mjs → verify:headers`.
- [ ] 7.3 Run `openspec validate --strict migrate-deploy-to-cloudflare-pages` once more. Acceptance: validation passes.
- [ ] 7.4 Push branch; confirm new `.github/workflows/deploy.yml` runs cleanly on push to the PR branch (workflow_dispatch only — actual production cutover is the manual Phase 5 sequence). Acceptance: PR shows both `deploy-github-pages.yml` (rename) AND `deploy.yml` (new Cloudflare Pages) workflows green on workflow_dispatch.

## 8. Phase 8 — Follow-up archive of GH Pages workflow

- [ ] 8.1 After ≥ 7 days of green soak, open follow-up OpenSpec change `archive-github-pages-deployment`: removes `.github/workflows/deploy-github-pages.yml`, archives the `github-pages-deployment` capability, removes Jekyll-related artifacts (`.nojekyll`, `_config.yml`). Files: NEW OpenSpec change directory. Acceptance: change scaffolded; this change's tasks.md cross-references it.
- [ ] 8.2 Update `docs/deploy.md` to reflect the post-archive state: GH Pages workflow no longer present; rollback procedure changes from "revert CNAME" to "revert CNAME + reinstate GH Pages workflow from `git log` history". Files: `docs/deploy.md`. Acceptance: document accurate post-archive.
