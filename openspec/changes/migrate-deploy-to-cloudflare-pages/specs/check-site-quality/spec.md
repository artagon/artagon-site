## ADDED Requirements

### Requirement: Cloudflare Pages Headers Verification Gate

`scripts/verify-headers.mjs` (`npm run verify:headers`) MUST run as part of `npm run postbuild` after `csp.mjs`. The gate parses `public/_headers` and compares the `Content-Security-Policy` value to the value emitted in `<meta http-equiv="Content-Security-Policy">` by `scripts/csp.mjs`. The gate also verifies that the required security headers (HSTS, COOP, COEP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are declared in `_headers` for the `/* ` block. Any drift or missing header MUST exit non-zero with a concrete diagnostic.

#### Scenario: CSP drift fails the build

- **WHEN** `_headers` declares a CSP value that differs from the `<meta>` CSP emitted into `dist/index.html`
- **THEN** `verify-headers.mjs` exits non-zero with `CSP drift: <meta> = "..."; _headers = "..."`.

#### Scenario: Missing required header fails the build

- **WHEN** `_headers` is missing one of the 7 required security headers (HSTS, COOP, COEP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy) for the `/*` block
- **THEN** `verify-headers.mjs` exits non-zero with `_headers missing required header: <name>`.

#### Scenario: HSTS max-age below minimum fails the build

- **WHEN** the `Strict-Transport-Security` value declares `max-age` < 31536000 (1 year)
- **THEN** `verify-headers.mjs` exits non-zero with `HSTS max-age=<value> below 1-year minimum`.

#### Scenario: Postbuild integrates the gate after csp.mjs

- **WHEN** `npm run postbuild` runs
- **THEN** the chain executes `scripts/csp.mjs` (which now also writes `_headers`) followed by `scripts/verify-headers.mjs`; if either fails, the build exits non-zero before `lint:design` runs.

### Requirement: Content Parity Verification Before DNS Cut

`scripts/verify-content-parity.mjs` (`npm run verify:content-parity`) MUST be available for use during DNS cutover. The script accepts two URLs (the GH Pages canonical and the Cloudflare Pages preview), fetches every route in `src/pages/**/*.astro` plus `index.html`, computes a normalized hash of each response body (excluding env-specific headers and dynamic timestamps), and exits non-zero if any path's hash differs.

The script is invoked manually as part of the cutover playbook documented in `docs/deploy.md`. It is NOT part of postbuild — its purpose is comparing two live deploy targets, not validating a single build.

#### Scenario: Identical content passes parity check

- **WHEN** the maintainer runs `npm run verify:content-parity -- https://artagon.com https://main.artagon.pages.dev`
- **THEN** the script fetches every route, computes hashes, and exits zero with a per-route summary.

#### Scenario: Drift between targets fails parity check

- **WHEN** Cloudflare's deploy injects unexpected content (e.g., an analytics beacon) that GH Pages' deploy lacks
- **THEN** the script exits non-zero with `parity drift at <path>: gh-pages-hash=... cloudflare-hash=...`.
