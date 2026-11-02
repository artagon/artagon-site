## ADDED Requirements

### Requirement: Named Postbuild Runner and Stage Timing

`package.json` `scripts.postbuild` MUST invoke `node scripts/postbuild.mjs`. `scripts/postbuild.mjs` SHALL export the ordered `POSTBUILD_STAGES` list matching the canonical postbuild gate sequence (`verify:prerequisites`, `verify:design-prerequisites`, `lint:tokens`, `verify-font-self-hosting.mjs`, `minify-theme-css.mjs`, `sri.mjs`, `csp.mjs`, `lint:skip-link`, `lint:taglines`, `lint:design`, `lint:design-md-uniqueness`, `verify:indexation`), MUST guard its execution entrypoint so importing `POSTBUILD_STAGES` has zero side effects, and MUST execute each stage sequentially in a separate child process (including composite stage bodies such as `lint:design` = `npm run check:oklch-hex-parity && design.md lint DESIGN.md`).

The runner MUST:

- Preserve strict fail-fast semantics: if any stage exits non-zero, fails to spawn, or is terminated by a signal, the runner MUST immediately stop without executing subsequent stages and MUST exit with that stage's non-zero exit code (or `1` on spawn error or signal termination).
- Emit a structured timing line (`[postbuild] <stage-name> (<elapsed>ms)`) after each stage completes and a final total line (`[postbuild] completed <N> stages in <total>ms`).
- Keep `README.md` (`### Build Scripts` ordered list) and `tests/lint-readme-postbuild-chain-sync.test.mts` synchronized with `POSTBUILD_STAGES` so adding, removing, or reordering any stage without updating `README.md` fails the Vitest sync gate.

#### Scenario: Runner executes all stages in order and prints timing

- **GIVEN** a valid `.build/dist/` tree produced by `astro build` and `POSTBUILD_STAGES` exported by `scripts/postbuild.mjs`
- **WHEN** `npm run postbuild` (or `node scripts/postbuild.mjs`) runs
- **THEN** all 12 stages execute in the exact order declared in `POSTBUILD_STAGES` (including both `check:oklch-hex-parity` and `design.md lint DESIGN.md` within `lint:design`), each stage logs `[postbuild] <stage-name> (<elapsed>ms)`, and the process exits `0` with a total elapsed summary.

#### Scenario: Failing stage or signal short-circuits subsequent stages and propagates exit code

- **GIVEN** stage `K` in `POSTBUILD_STAGES` exits with non-zero code `E`, fails to spawn, or is terminated by `SIGTERM`
- **WHEN** `node scripts/postbuild.mjs` runs
- **THEN** stages `1..K-1` run, stage `K` fails, stages `K+1..N` DO NOT run, and `node scripts/postbuild.mjs` exits with code `E` (or `1` on spawn error or signal termination).

#### Scenario: Importing POSTBUILD_STAGES does not execute postbuild stages

- **GIVEN** a test or sync script that imports `POSTBUILD_STAGES` from `scripts/postbuild.mjs`
- **WHEN** the module is imported in Node or Vitest
- **THEN** `POSTBUILD_STAGES` is returned as a 12-element ordered array and zero child processes are spawned on import.

#### Scenario: README postbuild list drift fails Vitest gate

- **GIVEN** `scripts/postbuild.mjs` and `README.md` (`### Build Scripts`) are gated by `tests/lint-readme-postbuild-chain-sync.test.mts`
- **WHEN** a contributor reorders or adds an entry in `POSTBUILD_STAGES` in `scripts/postbuild.mjs` without updating the numbered list under `### Build Scripts` in `README.md`
- **THEN** `tests/lint-readme-postbuild-chain-sync.test.mts` fails with an explicit order/missing-step drift error.

## MODIFIED Requirements

### Requirement: .build/ Umbrella Layout

All runtime build, cache, and report artifacts MUST live under the repo-root `.build/` directory, organized into three top-level subdirectories with distinct semantics:

- `.build/cache/` — reusable locally; currently only Astro's configured cache; safe to nuke for a fresh build without losing reports. CI does not currently persist this directory.
- `.build/reports/` — per-run artifact outputs; CI uploads tool-specific artifacts; per-run cleanup separate from cache cleanup.
- `.build/dist/` — deploy artifact; produced by `astro build`, consumed by GitHub Pages.

CLI-managed legacy caches and framework-hardcoded generated directories (`.astro/`, `.lighthouseci/`, and the `.lycheecache` file) are current exceptions to this configured-path layout. While `astro.config.ts` routes `cacheDir` to `BUILD.cache.astro` (`.build/cache/astro`), `astro@7.4.5` hardcodes `dotAstroDir` to `new URL(".astro/", config.root)` in `node_modules/astro/dist/core/config/settings.js:16-17` for generated TypeScript declarations (`.astro/types.d.ts`, `.astro/content.d.ts`), CLI preferences (`.astro/settings.json`), and `astro dev` content-layer storage (`data-store.json` during development; production builds write `data-store.json` to `settings.config.cacheDir` per `node_modules/astro/dist/content/paths.js:7-9`). These exceptions remain ignored in place via `.gitignore` and MUST NOT be represented as unwired `BUILD.cache` leaves.

The entire `.build/` tree MUST be a single `.gitignore` entry. Nested entries for individual tools' caches under `.build/` MUST NOT appear.

#### Scenario: Single .gitignore line covers all artifacts

- **GIVEN** the repository `.gitignore` file at the checkout root
- **WHEN** `.gitignore` is parsed
- **THEN** it contains exactly one line `.build/` covering all build/cache/report directories under `.build/`.

#### Scenario: CLI-managed root exceptions remain ignored, untracked, and separated from BUILD.cache.astro

- **GIVEN** `standardize-repository-layout` PR 1 Task `1.2` (`git rm --cached .lycheecache`) has landed and `astro sync`, `astro check`, or `npm run build` has run
- **WHEN** `.gitignore`, `git ls-files`, and the filesystem are inspected
- **THEN** `.gitignore` contains explicit root ignore entries for `.astro/`, `.lighthouseci/`, and `.lycheecache`, `git ls-files .astro .lighthouseci .lycheecache` returns zero tracked files, generated TypeScript metadata resides under `.astro/`, and production build cache resides under `BUILD.cache.astro` (`.build/cache/astro`).

#### Scenario: Cache cleanup preserves reports

- **GIVEN** `.build/cache/`, `.build/reports/`, and `.build/dist/` exist on disk
- **WHEN** a contributor runs `npm run clean:cache`
- **THEN** `.build/cache/` is removed but `.build/reports/` and `.build/dist/` remain.

#### Scenario: Public deliverables stay outside .build

- **GIVEN** the committed static asset tree in the repository
- **WHEN** the repo is inspected
- **THEN** `public/assets/logos/*.png`, `public/favicon.ico`, `public/icons/icon-*.png`, `public/apple-touch-icon.png` remain under `public/` (committed deliverables, not runtime artifacts).

### Requirement: CI Cache Strategy

CI currently caches npm downloads and does not restore `.build/cache/`. If a future CI cache step mounts `.build/cache/`, it MUST derive its key from `hashFiles('build.config.json', 'package-lock.json')`, never the cache contents themselves.

`build.config.json` MUST define `reports.buildProvenance` as `.build/reports/build-provenance`, and `build.config.ts` MUST expose it as `BUILD.reports.buildProvenance` in `BuildPaths` and `REQUIRED_SHAPE`. Within `.github/workflows/playwright.yml`, a single read-only `build` job MUST execute `npm run build` once per workflow run, write a provenance manifest (`${BUILD.reports.buildProvenance}/provenance.json`, i.e., `.build/reports/build-provenance/provenance.json`) recording `sha` (`github.sha`), `runId` (`github.run_id`), `producerRunAttempt` (`github.run_attempt`), `nodeVersion` (`process.version`), SHA-256 digests of `package-lock.json`, `build.config.json`, and `astro.config.ts`, and a per-file SHA-256 manifest of `.build/dist/`, and upload `.build/dist/` plus `.build/reports/build-provenance/provenance.json` as a short-lived (`retention-days: 1`) workflow artifact exposing `outputs.artifact-id`, `outputs.producer-run-attempt`, and `outputs.manifest-sha256`. The 5 `test` matrix shards, `visual-regression`, and `accessibility` jobs MUST declare `needs: [build]`, download that exact artifact by `artifact-ids: ${{ needs.build.outputs.artifact-id }}`, and run `node scripts/verify-build-provenance.mjs --verify` with `EXPECTED_PRODUCER_RUN_ATTEMPT: ${{ needs.build.outputs.producer-run-attempt }}` and `EXPECTED_MANIFEST_SHA256: ${{ needs.build.outputs.manifest-sha256 }}` before executing Vitest or Playwright suites. Binding `producerRunAttempt` to `needs.build.outputs.producer-run-attempt` rather than the consumer's `GITHUB_RUN_ATTEMPT` MUST allow "Re-run failed jobs" on a consumer attempt while the 1-day artifact exists; if the artifact has expired, download fails closed and requires "Re-run all jobs". Build artifacts MUST NOT be reused across distinct workflow runs, across other workflows (`.github/workflows/deploy.yml`, `.github/workflows/lighthouse.yml`), or in trusted write-scoped jobs (`update-snapshots`).

To preserve fail-closed enforcement across all 13 required status checks (`docs/build-artifacts.md:118`) without breaking manual `workflow_dispatch` runs where `visual-regression` intentionally skips (`.github/workflows/playwright.yml:221,275`), the required `merge-reports` job in `.github/workflows/playwright.yml` MUST declare `needs: [build, test, visual-regression, accessibility]` and `if: ${{ always() }}`, merge shard blob reports whenever `build` succeeded and `test` was not skipped, and enforce an event-aware expected-job policy in an always-run final step: `needs.build.result`, `needs.test.result`, and `needs.accessibility.result` MUST equal `'success'` on all events; `needs.visual-regression.result` MUST equal `'success'` on `pull_request` and `push` (`github.event_name != 'workflow_dispatch'`) and MAY equal `'skipped'` only when `github.event_name == 'workflow_dispatch'`; and any other skip, failure, or cancellation MUST exit `1`.

The Playwright workflow MUST upload per-shard blob reports from `BUILD.reports.playwright.blob` with `if: always()` and `retention-days: 14`. It MUST merge those blobs with the lockfile-pinned CLI and write HTML to `BUILD.reports.playwright.html`. Empty report uploads and merge failures MUST fail. Fourteen-day retention bounds artifact lifetime; storage quota headroom is not guaranteed.

#### Scenario: Playwright jobs reuse same-run build artifact with SSoT provenance verification

- **GIVEN** `.github/workflows/playwright.yml` is triggered by a `pull_request` or `push` to `main`
- **WHEN** the `build` job completes `npm run build` and uploads `.build/dist/` and `.build/reports/build-provenance/provenance.json`
- **THEN** each of the 5 `test` shards, `visual-regression`, and `accessibility` downloads that artifact by `needs.build.outputs.artifact-id` and passes `node scripts/verify-build-provenance.mjs --verify` without re-running `npm run build`.

#### Scenario: Partial rerun of a failed consumer job succeeds against a valid attempt-1 producer artifact

- **GIVEN** the `build` job succeeded on attempt `1` (`needs.build.outputs.producer-run-attempt == '1'`) and its artifact is still within the 1-day retention window, while a browser consumer job is retried via "Re-run failed jobs" on attempt `2` (`GITHUB_RUN_ATTEMPT == '2'`)
- **WHEN** the retried consumer downloads `needs.build.outputs.artifact-id` and runs `node scripts/verify-build-provenance.mjs --verify` with `EXPECTED_PRODUCER_RUN_ATTEMPT=1`
- **THEN** the verifier confirms `manifest.producerRunAttempt === "1"`, `manifest.sha === GITHUB_SHA`, `manifest.runId === GITHUB_RUN_ID`, `EXPECTED_MANIFEST_SHA256`, `nodeVersion`, input digests, and `.build/dist/` file hashes all match, and exits `0` so the retried browser job runs.

#### Scenario: Build artifact provenance mismatch or expired artifact fails closed

- **GIVEN** a consumer job downloads an artifact whose `provenance.json` is missing/expired or whose `sha`, `runId`, `producerRunAttempt` (`!= EXPECTED_PRODUCER_RUN_ATTEMPT`), manifest SHA-256 (`!= EXPECTED_MANIFEST_SHA256`), `nodeVersion`, input config digests, or `.build/dist/` file set/digests do not match the runner checkout
- **WHEN** `node scripts/verify-build-provenance.mjs --verify` (or `actions/download-artifact`) runs
- **THEN** the step exits non-zero and aborts the job before any test executes.

#### Scenario: Producer build or upload failure fails required merge-reports check

- **GIVEN** the `build` producer job in `.github/workflows/playwright.yml` fails, errors on artifact upload, or is cancelled (or `visual-regression` is unexpectedly skipped on a `pull_request` or `push`), causing downstream browser jobs to be skipped
- **WHEN** `merge-reports` executes under `if: ${{ always() }}` and `needs: [build, test, visual-regression, accessibility]`
- **THEN** `merge-reports` runs and exits non-zero (`conclusion: failure`) because `needs.build.result` and required downstream results do not satisfy the event-aware expected-job policy, preventing a PR or push from satisfying required status checks.

#### Scenario: Manual workflow_dispatch run permits intentional visual-regression skip while enforcing build, test, and accessibility success

- **GIVEN** `.github/workflows/playwright.yml` is triggered via `workflow_dispatch` (either on `refs/heads/main` where `update-snapshots` builds and runs independently, or on another ref where `update-snapshots` is skipped) and `visual-regression` is skipped due to `if: github.event_name != 'workflow_dispatch'`
- **WHEN** `merge-reports` executes under `if: ${{ always() }}` and `needs: [build, test, visual-regression, accessibility]`
- **THEN** `merge-reports` exits `0` when `needs.build.result`, `needs.test.result`, and `needs.accessibility.result` all equal `'success'` and `needs.visual-regression.result` equals `'skipped'`, and exits `1` if `build`, `test`, or `accessibility` is `'failure'`, `'cancelled'`, or `'skipped'` or if `visual-regression` is `'failure'` or `'cancelled'`.

#### Scenario: Reports uploaded on failure

- **GIVEN** the `build` job succeeded and one or more Playwright tests fail in a shard
- **WHEN** the shard and `merge-reports` jobs finish
- **THEN** the workflow uploads shard and merged report artifacts with `retention-days: 14`, and `merge-reports` subsequently exits non-zero to reflect the upstream test failure.

#### Scenario: Reports uploaded on success

- **GIVEN** the `build` job and all Playwright jobs (`test`, `visual-regression`, `accessibility`) pass
- **WHEN** the workflow completes
- **THEN** report artifacts are uploaded with `retention-days: 14` and `merge-reports` exits `0`; reviewers can download to inspect Lighthouse + Playwright HTML reports.

#### Scenario: Cache key is content-derived, not self-hashed

- **GIVEN** a future CI workflow persists `.build/cache/`
- **WHEN** that cache step is inspected
- **THEN** `key:` resolves to `hashFiles('build.config.json', 'package-lock.json')` (or includes those files); the key does NOT include `hashFiles('.build/cache/**')` or any other glob over the cache contents themselves.
