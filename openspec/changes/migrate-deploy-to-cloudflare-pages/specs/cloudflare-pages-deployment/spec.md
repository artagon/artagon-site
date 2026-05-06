## ADDED Requirements

### Requirement: Cloudflare Pages is the production deploy target

The site MUST deploy to a Cloudflare Pages project named `artagon` on production push to `main`. Deployment uses `cloudflare/wrangler-action` (SHA-pinned) with `wrangler pages deploy ./.build/dist --project-name=artagon --branch=main`. Authentication uses `secrets.CLOUDFLARE_API_TOKEN` scoped to `Account.Cloudflare Pages:Edit` for the `artagon` project ONLY — the token MUST NOT have account-wide privileges.

#### Scenario: Production push deploys to Cloudflare Pages

- **WHEN** a commit lands on `main`
- **THEN** `.github/workflows/deploy.yml` runs `wrangler pages deploy` against the Cloudflare Pages `artagon` project; the new deployment becomes the production deployment for `artagon.com`.

#### Scenario: API token is project-scoped

- **WHEN** the Cloudflare API token's permissions are inspected
- **THEN** the token has exactly `Account.Cloudflare Pages:Edit` for the `artagon` project; no `Account.Workers:Edit`, `Zone.DNS:Edit`, or other privileges.

### Requirement: PR preview deploys

Every pull request MUST trigger a preview deploy to a per-branch Cloudflare Pages preview URL (`<branch-slug>.artagon.pages.dev`). The preview deploy URL MUST be posted as a PR comment so reviewers can click through. Preview URLs MUST emit `X-Robots-Tag: noindex, nofollow` so they are not indexed by search engines.

#### Scenario: PR opens a preview deploy

- **WHEN** a pull request is opened or synchronized
- **THEN** `.github/workflows/deploy-cloudflare-pages-preview.yml` deploys the branch's `dist/` to `<branch-slug>.artagon.pages.dev` and posts the URL as a PR comment.

#### Scenario: Preview URLs are not indexed

- **WHEN** any `*.artagon.pages.dev` URL is fetched
- **THEN** the response carries `X-Robots-Tag: noindex, nofollow` per the `_headers` configuration scoped to preview environments.

### Requirement: `public/_headers` declares HTTP security headers

The repo MUST contain `public/_headers` declaring (at minimum) the following headers for every path under `/*`: `Content-Security-Policy`, `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/microphone/geolocation/payment/usb/magnetometer/gyroscope/accelerometer, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`.

The `Content-Security-Policy` value in `_headers` MUST be byte-identical to the value emitted in the `<meta http-equiv="Content-Security-Policy">` tag by `scripts/csp.mjs`. `scripts/verify-headers.mjs` MUST run as a postbuild gate and fail the build on any divergence.

#### Scenario: Security headers ship on every route

- **WHEN** any built route is fetched in production
- **THEN** the response carries all 7 declared security headers with the documented values.

#### Scenario: CSP drift between meta tag and header fails the build

- **WHEN** a contributor edits `public/_headers` directly without running `scripts/csp.mjs --write`
- **THEN** `scripts/verify-headers.mjs` exits non-zero with `CSP drift between <meta> and Content-Security-Policy header at <path>`.

#### Scenario: HSTS preload-eligible

- **WHEN** the `Strict-Transport-Security` header is inspected
- **THEN** the value is `max-age=63072000; includeSubDomains; preload` — meeting the Chromium HSTS preload list submission requirements.

### Requirement: Edge cache headers per file class

`public/_headers` MUST declare `Cache-Control` rules per file class:

- Hashed assets under `/assets/*` (other than fonts): `Cache-Control: public, max-age=31536000, immutable`.
- Self-hosted fonts under `/assets/fonts/*`: `Cache-Control: public, max-age=31536000, immutable`.
- HTML routes (`*.html`): `Cache-Control: public, max-age=0, must-revalidate` plus `Vary: Accept-Encoding`.
- Sitemap and robots files (`sitemap-index.xml`, `sitemap-0.xml`, `robots.txt`): `Cache-Control: public, max-age=3600`.

The cache rules MUST appear AFTER the global `/* ` security-headers block in `_headers` so per-class blocks override the global default.

#### Scenario: Hashed asset is immutable-cached

- **WHEN** a request for `/assets/index.D9mrT8mP.js` (hashed asset) hits Cloudflare's edge
- **THEN** the response carries `Cache-Control: public, max-age=31536000, immutable` and is served from edge cache without origin revalidation.

#### Scenario: HTML routes revalidate

- **WHEN** a request for `/platform/index.html` hits Cloudflare's edge
- **THEN** the response carries `Cache-Control: public, max-age=0, must-revalidate` so each request triggers an origin revalidation.

### Requirement: Same-origin redirects via `_redirects`

`public/_redirects` MUST contain only entries whose destination is same-origin (begins with `/`). Cross-origin destinations (containing `://` or starting with `//`) are FORBIDDEN. `scripts/validate-indexation.mjs` (defined in `update-site-marketing-redesign`) is the gate; this requirement re-asserts the constraint at the deploy-platform contract level so the rule applies even before USMR archives.

#### Scenario: Cross-origin redirect destination fails the build

- **WHEN** a contributor adds `/foo https://attacker.example/path 301` to `public/_redirects`
- **THEN** `scripts/validate-indexation.mjs` exits non-zero with `cross-origin destination forbidden`.

### Requirement: DNS cutover playbook is documented

`docs/deploy.md` MUST document the 7-step DNS cutover playbook from GitHub Pages to Cloudflare Pages, including: pre-cutover Cloudflare project verification, TTL drop window, the parallel-deploy guarantee (both workflows continue depositing identical content during cutover), post-cutover monitoring window (24 hours), and the DNS-only rollback procedure.

#### Scenario: Cutover documentation is greppable

- **WHEN** a maintainer searches `docs/deploy.md` for "rollback"
- **THEN** the document contains a labeled "Rollback" section with the 1-step procedure: revert the CNAME at the registrar; recovery time ≤ 5 minutes; no code change required.

### Requirement: Origin lockdown defaults

The Cloudflare Pages project MUST have these settings enabled:

- "Always Use HTTPS" page rule.
- "Automatic HTTPS Rewrites" enabled.
- Minimum TLS version 1.2 (older versions rejected).
- Auto-Minify DISABLED (would mutate HTML and break SRI hashes).

These settings MUST be documented in `docs/deploy.md` so they survive account migrations.

#### Scenario: TLS 1.0/1.1 client is rejected

- **WHEN** a client negotiates a TLS 1.0 or 1.1 handshake against `artagon.com`
- **THEN** Cloudflare rejects with TLS handshake failure.

#### Scenario: HTTP request is upgraded to HTTPS

- **WHEN** a client requests `http://artagon.com/`
- **THEN** Cloudflare responds 301 → `https://artagon.com/`.
