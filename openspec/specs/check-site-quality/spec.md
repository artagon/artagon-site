# check-site-quality Specification

## Purpose

This capability defines the contracts that govern Lighthouse CI runs, lychee link-checks, and Playwright test outputs against the artagon-site Astro build. Each Requirement below describes behavior that is implemented and exercised by `main` today.

Forward-looking contracts that depend on still-unarchived OpenSpec changes (e.g., trace sanitization, single-blob report artifacts, `.run.lock` sentinel, `PWTEST_CACHE_DIR` env wiring, the `reports-${{ github.sha }}` consolidated artifact) are tracked under their owning change proposals — they are NOT promised here. When those changes archive, this spec amends to absorb them.

## Requirements

### Requirement: Lighthouse CI Ready Signal

The system SHALL start the Lighthouse CI local server via `scripts/lhci-serve.mjs`, and the server SHALL emit a `READY` line once it can serve `http://localhost:8081/`. Lighthouse CI report output MUST be written to `.build/reports/lhci/`, sourced from `build.config.json` via `scripts/sync-build-config.mjs`. `lighthouserc.json` is a generated file. CLI-managed runtime state remains in the ignored `.lighthouseci/` directory; it is not wired to `BUILD.cache` or restored by CI.

This Requirement governs ONLY paths and the ready-signal contract. Assertion shape (URL/category gates, severity) is governed by a future `Lighthouse CI Performance Gate` Requirement under the `style-system` capability — that requirement is currently in the unarchived `update-site-marketing-redesign` change and will be cross-referenced here once it archives. Until then, the marketing-route assertion contract remains in `lighthouserc.json` directly via the `lhci-assertions.json` fixture consumed by the sync script.

#### Scenario: LHCI starts audits after readiness

- **WHEN** `npx -y @lhci/cli@0.15.x autorun --config=lighthouserc.json` runs after `npm run build`
- **THEN** the configured server prints `READY` before Lighthouse audits begin

#### Scenario: Lighthouse reports under .build/reports

- **WHEN** Lighthouse CI runs successfully
- **THEN** report HTML files are written to `.build/reports/lhci/`; CLI-managed runtime state remains in `.lighthouseci/`.

#### Scenario: Lighthouse drift fails CI

- **WHEN** a contributor edits `lighthouserc.json` directly without running `sync:build-config`
- **THEN** CI's drift gate fails with "build config drift" before Lighthouse executes.

### Requirement: Lychee Configuration Compatibility

The link checker SHALL use a Lychee configuration with numeric `timeout` and `retry_wait_time`, accepted status codes, and local-build exclusions. The generated `lychee.toml` SHALL enable caching with `cache = true` and derive the build-output entries of `exclude_path` from `build.config.json`; it SHALL NOT emit a `root_dir` or the removed `cache_path` field. The link-check workflow SHALL pass the checkout path with `--root-dir` when invoking Lychee. The workflow does not pass `--cache-dir` or restore a cache; Lychee's default `.lycheecache` file remains ignored.

#### Scenario: Lychee loads config and checks sources

- **WHEN** `.github/workflows/link-check.yml` runs Lychee with `--root-dir <checkout>`, `--config lychee.toml`, and the Markdown, public HTML, and Astro source globs
- **THEN** Lychee parses the configuration, resolves root-relative paths against the checkout, and checks links while excluding `.build/`, `node_modules`, and localhost URLs

#### Scenario: Lychee cache configuration matches the workflow

- **WHEN** Lychee runs with the generated `lychee.toml`
- **THEN** caching is enabled without a `cache_path` field or a promise that CI persists `.build/cache/lychee/`.

### Requirement: Playwright tests produce structured reports

Playwright tests MUST emit per-test results to `.build/reports/playwright/results/` and HTML reports to `.build/reports/playwright/html/`. CI shards MUST also emit blob reports to `.build/reports/playwright/blob/` for merging. These paths MUST be sourced from `build.config.ts` via `BUILD` in `playwright.config.ts`; no string literals duplicating these paths may appear in that config. No Playwright cache path is wired. CI MUST upload per-shard blobs with `retention-days: 14` and merge them with the lockfile-pinned CLI, writing combined HTML to `BUILD.reports.playwright.html`.

#### Scenario: Playwright reports under .build/reports

- **WHEN** Playwright tests run (passing or failing)
- **THEN** the per-test artifacts are at `.build/reports/playwright/results/`; the HTML report is at `.build/reports/playwright/html/`; no output appears at the legacy `test-results/` or `playwright-report/` paths.
