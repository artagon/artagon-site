## MODIFIED Requirements

### Requirement: Lighthouse CI runs on built site

Lighthouse CI MUST run against the built site as part of CI. Lighthouse output (per-run reports) MUST be written to `.build/reports/lhci/`; Lighthouse runtime cache (e.g., the `.lighthouseci` index file the CLI maintains across runs) MUST be written to `.build/cache/lhci/`. Both paths MUST be sourced from `build.config.json` via `scripts/sync-build-config.mjs` — `lighthouserc.json` is a generated file. The CI workflow MUST upload `.build/reports/lhci/` as part of the `reports-${{ github.sha }}` artifact.

#### Scenario: Lighthouse reports under .build/reports

- **WHEN** Lighthouse CI runs successfully and `assertMatrix` passes for every URL
- **THEN** report HTML files are written to `.build/reports/lhci/`; runtime state is written to `.build/cache/lhci/`.

#### Scenario: Lighthouse drift fails CI

- **WHEN** a contributor edits `lighthouserc.json` directly without running `sync:build-config`
- **THEN** CI's drift gate fails with "build config drift" before Lighthouse executes.

### Requirement: Playwright tests produce structured reports

Playwright tests MUST emit results to `.build/reports/playwright/results/` and HTML reports to `.build/reports/playwright/html/`. The test cache MUST live at `.build/cache/playwright/`. All three paths MUST be sourced from `build.config.ts` via `import { BUILD } from './build.config.ts'` in `playwright.config.ts`. The CI workflow MUST upload `.build/reports/playwright/` as part of the `reports-${{ github.sha }}` artifact.

#### Scenario: Playwright reports under .build/reports

- **WHEN** Playwright tests run (passing or failing)
- **THEN** the per-test artifacts are at `.build/reports/playwright/results/`; the HTML report is at `.build/reports/playwright/html/`; no output appears at the legacy `test-results/` or `playwright-report/` paths.

#### Scenario: PWTEST_CACHE_DIR set in CI

- **WHEN** CI workflow env is inspected
- **THEN** `PWTEST_CACHE_DIR=.build/cache/playwright` is set so Playwright's install cache shares the umbrella cache key.
