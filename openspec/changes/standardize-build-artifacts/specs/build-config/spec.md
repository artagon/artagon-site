## ADDED Requirements

### Requirement: .build/ Umbrella Layout

All runtime build, cache, and report artifacts MUST live under the repo-root `.build/` directory, organized into three top-level subdirectories with distinct semantics:

- `.build/cache/` — reusable across runs; CI cache key target; safe to nuke for fresh build without losing reports.
- `.build/reports/` — per-run artifact outputs; CI uploads as a single artifact glob; per-run cleanup separate from cache cleanup.
- `.build/dist/` — deploy artifact; produced by `astro build`, consumed by GitHub Pages.

The entire `.build/` tree MUST be a single `.gitignore` entry. Nested entries for individual tools' caches MUST NOT appear.

#### Scenario: Single .gitignore line covers all artifacts

- **WHEN** `.gitignore` is parsed
- **THEN** it contains exactly one line `.build/` covering all build/cache/report directories.

#### Scenario: Cache cleanup preserves reports

- **WHEN** a contributor runs `npm run clean:cache`
- **THEN** `.build/cache/` is removed but `.build/reports/` and `.build/dist/` remain.

#### Scenario: Public deliverables stay outside .build

- **WHEN** the repo is inspected
- **THEN** `public/assets/logos/*.png`, `public/favicon.svg`, `public/icon-*.png`, `public/apple-touch-icon.png` remain under `public/` (committed deliverables, not runtime artifacts).

### Requirement: Single Source of Truth Path Config

A single `build.config.json` at the repo root MUST be the canonical source of truth for every path under `.build/`. A typed `build.config.ts` MUST wrap the JSON via `as const satisfies BuildPaths` to give TypeScript-aware tools a typed import surface. Tools that accept TS/JS configs (Astro, Playwright) MUST import `BUILD` from `build.config.ts`; they MUST NOT duplicate path strings. Tools that require JSON/YAML/TOML (Lighthouse CI, Lychee, GitHub Actions YAML) MUST consume paths via files generated from `build.config.json` by `scripts/sync-build-config.mjs`.

#### Scenario: TS config imports BUILD constant

- **WHEN** `astro.config.ts` is inspected
- **THEN** it imports `BUILD` from `./build.config.ts` and references `BUILD.dist` for `outDir` and `BUILD.cache.astro` for `cacheDir`; no string literals like `'.build/dist'` appear directly in the config file.

#### Scenario: Path strings appear ONLY in SSoT files

- **WHEN** `git grep -E "(^|[^.])\.build/" -- ':!build.config.*' ':!*.md' ':!.gitignore' ':!.github/**' ':!lighthouserc.json' ':!lychee.toml'` runs
- **THEN** zero matches; non-SSoT, non-generated files reference paths only via the typed `BUILD` constant.

#### Scenario: JSON neutral form readable by Bazel

- **WHEN** `build.config.json` is parsed by any JSON-aware tool (jq, Python, Starlark)
- **THEN** the file is well-formed JSON containing only path strings — no comments, no JS expressions, no TS-only constructs — making it loadable from Starlark via `json.decode(read_file(...))` for future Bazel migration.

### Requirement: Sync Generator and Drift Gate

`scripts/sync-build-config.mjs` MUST regenerate every JSON/YAML/TOML config that consumes BUILD paths from `build.config.json`. The script MUST be idempotent (re-running with no source change produces zero file system writes; verified by content-hash comparison before write). CI MUST run `npm run sync:build-config && git diff --exit-code` and fail the build if the post-sync diff is non-empty.

The script MUST regenerate at minimum: `lighthouserc.json` (assertions + outputDir), `lychee.toml` (cache_path), `.github/workflows/deploy.yml` (`path:` field for `actions/upload-pages-artifact`), `.github/workflows/content-redeploy.yml` (cache mounts), `.github/workflows/design-md-drift.yml` (cache mounts).

#### Scenario: Sync is idempotent

- **WHEN** `npm run sync:build-config` runs twice in succession with no `build.config.json` change
- **THEN** the second run produces zero file writes (mtime on generated files unchanged).

#### Scenario: Drift gate fails on stale generated files

- **WHEN** a contributor edits `build.config.json` and commits without running `sync:build-config`
- **THEN** CI runs `npm run sync:build-config && git diff --exit-code`; the diff is non-empty; the build fails with "build config drift — run `npm run sync:build-config` locally and commit."

#### Scenario: Sync respects opt-out

- **WHEN** `SKIP_BUILD_SYNC=1 npm run build` runs (a hot-loop dev iteration)
- **THEN** the prebuild hook detects the env var and exits 0 without regenerating; documented in `docs/build-artifacts.md`.

### Requirement: prebuild Lifecycle Hook

`package.json` MUST declare a `prebuild` script that runs `node scripts/sync-build-config.mjs` BEFORE `astro build`. When other prebuild work exists (favicon and logo generation from `add-brand-assets-and-writing-pipeline`), the chain MUST run sync FIRST so dependent generators consume up-to-date paths.

#### Scenario: prebuild runs sync first

- **WHEN** `npm run build` is invoked
- **THEN** `scripts/sync-build-config.mjs` executes BEFORE `astro build`; `BUILD.dist` resolves to `.build/dist`; the build emits its output there.

#### Scenario: prebuild chains are ordered

- **WHEN** both this change and `add-brand-assets-and-writing-pipeline` are archived
- **THEN** `package.json`'s `prebuild` script runs `sync:build-config` first, then `build:favicons`, then `build:logos`, then `astro build`.

### Requirement: Clean Scripts

`package.json` MUST declare three clean scripts:

- `npm run clean` — removes `.build/` entirely.
- `npm run clean:cache` — removes only `.build/cache/`.
- `npm run clean:reports` — removes only `.build/reports/`.

#### Scenario: clean nukes everything

- **WHEN** a contributor runs `npm run clean`
- **THEN** `.build/` does not exist on disk; `node_modules` is untouched.

#### Scenario: clean:cache preserves reports

- **WHEN** a contributor runs `npm run clean:cache` after a test run that produced reports
- **THEN** `.build/cache/` is gone but `.build/reports/playwright/` still contains the test results.

### Requirement: CI Artifact Upload

The CI workflow that runs Playwright + Lighthouse MUST upload `.build/reports/` as a single GitHub Actions artifact named `reports-${{ github.sha }}` with `if: always()` so reports are accessible regardless of test outcome.

#### Scenario: Reports uploaded on failure

- **WHEN** a CI run fails because Playwright tests fail
- **THEN** the workflow still uploads `.build/reports/` as an artifact; the failed run's PR shows the artifact link in the run summary.

#### Scenario: Reports uploaded on success

- **WHEN** a CI run passes
- **THEN** `.build/reports/` is uploaded; reviewers can download to inspect Lighthouse + Playwright HTML reports.

### Requirement: Bazel-Readiness Hooks

`build.config.json` MUST be the only data file required for a future Bazel adoption to consume the same paths. The JSON MUST contain only string-valued paths (no JS expressions, no environment-variable interpolation, no schema beyond plain object/string nesting). A future `build_paths.bzl` adapter MUST be implementable with `json.decode(read_file("//:build.config.json"))` returning a Starlark struct equivalent to the TS `BUILD` constant.

#### Scenario: JSON is loadable from Starlark

- **WHEN** a future contributor authors `build_paths.bzl` with `json.decode(read_file("//:build.config.json"))`
- **THEN** the resulting Starlark struct exposes the same field tree (`.dist`, `.cache.astro`, `.reports.playwright.results`, etc.) as the TS `BUILD` constant.

#### Scenario: No TS-only constructs in JSON source

- **WHEN** `build.config.json` is parsed by `jq` or Python's `json.load`
- **THEN** the parse succeeds; no comments, no trailing commas, no JS-specific syntax.
