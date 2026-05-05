# check-site-quality Specification

## Purpose
TBD - created by archiving change update-site-quality-checks. Update Purpose after archive.
## Requirements
### Requirement: Lighthouse CI Ready Signal

The system SHALL start the Lighthouse CI local server via `scripts/lhci-serve.mjs`, and the server SHALL emit a `READY` line once it can serve `http://localhost:8081/`. Lighthouse CI report output MUST be written to `.build/reports/lhci/` and Lighthouse runtime cache (the `.lighthouseci` index file the CLI maintains across runs) MUST be written to `.build/cache/lhci/`. Both paths MUST be sourced from `build.config.json` via `scripts/sync-build-config.mjs`; `lighthouserc.json` is a generated file. The CI workflow MUST upload `.build/reports/lhci/` as part of the `reports-${{ github.sha }}` artifact with `retention-days: 14`.

This Requirement governs ONLY paths and the ready-signal contract. Assertion shape (the `assertMatrix` URL/category gates) is governed by the `Lighthouse CI Performance Gate` Requirement under the `style-system` capability. The sync script merges both: paths from `build-config`, assertions from `style-system`. Spec text in either capability MUST cross-reference the other.

#### Scenario: LHCI starts audits after readiness

- **WHEN** `npx -y @lhci/cli@0.14.x autorun --config=lighthouserc.json` runs after `npm run build`
- **THEN** the configured server prints `READY` before Lighthouse audits begin

#### Scenario: Lighthouse reports under .build/reports

- **WHEN** Lighthouse CI runs successfully
- **THEN** report HTML files are written to `.build/reports/lhci/`; runtime state is written to `.build/cache/lhci/`.

#### Scenario: Lighthouse drift fails CI

- **WHEN** a contributor edits `lighthouserc.json` directly without running `sync:build-config`
- **THEN** CI's drift gate fails with "build config drift" before Lighthouse executes.

### Requirement: Lychee Configuration Compatibility

The link checker SHALL use a Lychee configuration compatible with current CLI schema, including numeric `timeout` and `retry_wait_time`, accepted status codes, and exclusions for local build artifacts. The Lychee `cache_path` MUST be `.build/cache/lychee/`, sourced from `build.config.json` via `scripts/sync-build-config.mjs`; `lychee.toml` is a generated file.

#### Scenario: Lychee loads config and checks sources

- **WHEN** running `lychee --config lychee.toml './**/*.md' './public/**/*.html' './src/**/*.astro'`
- **THEN** Lychee parses the configuration successfully and checks links while excluding `.build/`, `node_modules`, and localhost URLs

#### Scenario: Lychee cache under .build/cache

- **WHEN** Lychee runs with the generated `lychee.toml`
- **THEN** the cache database is written to `.build/cache/lychee/`, not the legacy `.cache/` location

### Requirement: Playwright tests produce structured reports

Playwright tests MUST emit per-test results to `.build/reports/playwright/results/` and HTML reports to `.build/reports/playwright/html/`. The test cache MUST live at `.build/cache/playwright/`. All three paths MUST be sourced from `build.config.ts` via `import { BUILD } from './build.config.ts'` in `playwright.config.ts`; no string literals duplicating these paths may appear in the config file. The CI workflow MUST upload `.build/reports/playwright/` as part of the `reports-${{ github.sha }}` artifact with `retention-days: 14`.

Playwright traces, HARs, and screenshots uploaded as artifacts MUST NOT contain real credentials. Sanitization MUST strip the following before any trace/HAR/screenshot is persisted to `.build/reports/playwright/`:

- Headers: `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, `X-Auth-Token`, `X-Api-Key`, `X-Csrf-Token`.
- URL query parameters: `access_token`, `id_token`, `code`, `state`, `refresh_token`, `client_secret`.
- Request/response body fields commonly carrying secrets: `password`, `token`, `jwt`, `samlResponse`, `client_secret`.

Playwright's TS config has no native header-filter API; sanitization MUST be implemented as a custom Reporter (`reporter: [['./tests/sanitizing-reporter.ts']]`) plus per-context `context.route()` redactors that mutate the recorded request/response before the trace is written. A post-trace processor (`scripts/sanitize-trace.mjs`) MUST run as a Phase 9 CI step that grep-asserts the persisted `.zip` traces contain none of the above tokens; the assertion MUST exit non-zero on any hit.

#### Scenario: Playwright reports under .build/reports

- **WHEN** Playwright tests run (passing or failing)
- **THEN** the per-test artifacts are at `.build/reports/playwright/results/`; the HTML report is at `.build/reports/playwright/html/`; no output appears at the legacy `test-results/` or `playwright-report/` paths.

#### Scenario: PWTEST_CACHE_DIR set in CI

- **WHEN** CI workflow env is inspected
- **THEN** `PWTEST_CACHE_DIR=.build/cache/playwright` is set so Playwright's install cache shares the umbrella cache key.

#### Scenario: Trace sanitization redacts credentials across surfaces

- **WHEN** a test exercises an authenticated request (with auth header, OAuth callback URL, or password body field) and persists a Playwright trace
- **THEN** the resulting `.zip` trace contains none of the listed headers, URL query params, or body field values; verification is an automated grep run by `scripts/sanitize-trace.mjs` against the persisted `.zip` in CI; the grep MUST exit non-zero on any hit

#### Scenario: clean:reports race-condition guard

- **WHEN** `npm run clean:reports` is invoked while a Playwright test run is writing to `.build/reports/playwright/html/`
- **THEN** the script detects an in-flight run via the `.build/.run.lock` sentinel file (single sentinel covering both cache and reports surfaces) and exits non-zero with a "tests in flight; refusing to delete reports" message rather than deleting the partially-written report tree

