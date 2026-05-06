## ADDED Requirements

### Requirement: Cloudflare Pages Headers Verification Gate

`scripts/verify-headers.mjs` (`npm run verify:headers`) MUST run as part of `npm run postbuild` after `csp.mjs`. The gate parses `dist/_headers` (the file `scripts/csp.mjs` writes during postbuild — see design.md D3) and verifies that the global `/*` `Content-Security-Policy` value is a SUPERSET of every per-page `<meta http-equiv="Content-Security-Policy">` value emitted by `scripts/csp.mjs` across all `.build/dist/**/*.html` files. The gate also verifies that the required security headers (HSTS, COOP, COEP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) are declared in `dist/_headers` for the `/*` block. Any drift or missing header MUST exit non-zero with a concrete diagnostic.

#### Scenario: CSP drift fails the build

- **WHEN** `dist/_headers` declares a `/*` CSP that is NOT a superset of any per-page `<meta>` CSP emitted into `.build/dist/**/*.html`
- **THEN** `verify-headers.mjs` exits non-zero with `CSP not a superset: <meta> at <route> includes directive X not in /* header`.

#### Scenario: Missing required header fails the build

- **WHEN** `dist/_headers` is missing one of the 7 required security headers (HSTS, COOP, COEP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy) for the `/*` block
- **THEN** `verify-headers.mjs` exits non-zero with `_headers missing required header: <name>`.

#### Scenario: HSTS max-age below current stage minimum fails the build

- **WHEN** the `Strict-Transport-Security` value declares `max-age` below the current expected stage threshold documented in `docs/hsts-stage.md` (Stage 1: 300; Stage 2: 86400; Stage 3: 2592000; Stage 4: 63072000+preload — see Cloudflare Pages spec "Staged HSTS Rollout" Requirement)
- **THEN** `verify-headers.mjs` exits non-zero with `HSTS max-age=<value> below stage-<N> minimum=<expected>`. The gate reads `docs/hsts-stage.md` to determine which stage is current; the maintainer advances the stage value in that file as part of each rollout PR.

#### Scenario: Postbuild integrates the gate after csp.mjs

- **WHEN** `npm run postbuild` runs
- **THEN** the chain executes `scripts/csp.mjs` (which now also writes `_headers`) followed by `scripts/verify-headers.mjs`; if either fails, the build exits non-zero before `lint:design` runs.

### Requirement: Content Parity Verification Before DNS Cut

`scripts/cutover/verify-content-parity.mjs` (`npm run verify:content-parity`) MUST be available for use during DNS cutover. The script lives under `scripts/cutover/` to mark it as a cutover-only tool (NOT part of postbuild). It accepts two URLs (the GH Pages canonical and the Cloudflare Pages preview), fetches every route in `src/pages/**/*.astro` plus `index.html`, computes a normalized hash of each response body (excluding env-specific headers and dynamic timestamps), and exits non-zero if any path's hash differs.

The script is invoked manually as part of the cutover playbook documented in `docs/deploy.md`. It is NOT part of postbuild — its purpose is comparing two live deploy targets, not validating a single build.

#### Scenario: Identical content passes parity check

- **WHEN** the maintainer runs `npm run verify:content-parity -- https://artagon.com "$CLOUDFLARE_PREVIEW_URL"`
- **THEN** the script fetches every route, computes hashes, and exits zero with a per-route summary.

#### Scenario: Drift between targets fails parity check

- **WHEN** Cloudflare's deploy injects unexpected content (e.g., an analytics beacon) that GH Pages' deploy lacks
- **THEN** the script exits non-zero with `parity drift at <path>: gh-pages-hash=... cloudflare-hash=...`.
