# check-site-quality Specification

## Purpose

This capability defines the contracts that govern Lighthouse CI runs, lychee link-checks, and Playwright test outputs against the artagon-site Astro build. Each Requirement below describes behavior that is implemented and exercised by `main` today.

Forward-looking contracts that depend on still-unarchived OpenSpec changes (e.g., trace sanitization, single-blob report artifacts, `.run.lock` sentinel, `PWTEST_CACHE_DIR` env wiring, the `reports-${{ github.sha }}` consolidated artifact) are tracked under their owning change proposals — they are NOT promised here. When those changes archive, this spec amends to absorb them.

## Requirements

### Requirement: Lighthouse CI Ready Signal

The system SHALL start the Lighthouse CI local server via `scripts/lhci-serve.mjs`, and the server SHALL emit a `READY` line once it can serve `http://localhost:8081/`. Lighthouse CI report output MUST be written to `.build/reports/lhci/` and Lighthouse runtime cache (the `.lighthouseci` index file the CLI maintains across runs) MUST be written to `.build/cache/lhci/`. Both paths MUST be sourced from `build.config.json` via `scripts/sync-build-config.mjs`; `lighthouserc.json` is a generated file.

This Requirement governs ONLY paths and the ready-signal contract. Assertion shape (URL/category gates, severity) is governed by a future `Lighthouse CI Performance Gate` Requirement under the `style-system` capability — that requirement is currently in the unarchived `update-site-marketing-redesign` change and will be cross-referenced here once it archives. Until then, the marketing-route assertion contract remains in `lighthouserc.json` directly via the `lhci-assertions.json` fixture consumed by the sync script.

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

Playwright tests MUST emit per-test results to `.build/reports/playwright/results/` and HTML reports to `.build/reports/playwright/html/`. The test cache MUST live at `.build/cache/playwright/`. All three paths MUST be sourced from `build.config.ts` via `import { BUILD } from './build.config.ts'` in `playwright.config.ts`; no string literals duplicating these paths may appear in the config file. The CI workflow MUST upload per-shard reports as workflow artifacts with `retention-days: 14`.

#### Scenario: Playwright reports under .build/reports

- **WHEN** Playwright tests run (passing or failing)
- **THEN** the per-test artifacts are at `.build/reports/playwright/results/`; the HTML report is at `.build/reports/playwright/html/`; no output appears at the legacy `test-results/` or `playwright-report/` paths.
