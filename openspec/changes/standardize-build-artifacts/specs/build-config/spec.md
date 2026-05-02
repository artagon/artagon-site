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

A single `build.config.json` at the repo root MUST be the canonical source of truth for every path under `.build/`. A typed `build.config.ts` MUST load the JSON via `fs.readFileSync` + `JSON.parse` (NOT via `with { type: 'json' }` import-attribute syntax, which requires `module: "nodenext"` and is inconsistently supported by Astro's Vite-based config loader at the time of this change), then expose a typed `BUILD` constant via the `satisfies BuildPaths` type assertion against a `DeepReadonly<typeof data>` wrapper. Tools that accept TS/JS configs (Astro, Playwright) MUST import `BUILD` from `build.config.ts`; they MUST NOT duplicate path strings. Tools that require JSON/YAML/TOML (Lighthouse CI, Lychee, GitHub Actions YAML) MUST consume paths via files generated from `build.config.json` by `scripts/sync-build-config.mjs`.

The `tsconfig.json` at the repo root MUST set `"resolveJsonModule": true`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, and `"target": "ES2022"` (or stricter). The `tsconfig.json` MUST be created if absent (the project currently has none at root); CI MUST run `astro check` post-rename to confirm typing.

Path strings written to `build.config.json` MUST conform to the regex `^\.build/[a-z0-9/_-]+$`. The sync generator MUST validate every path string against this regex BEFORE writing any output file and MUST exit non-zero on violation. Paths containing `..`, newlines, backticks, `$()`, or absolute prefixes are rejected. This guards against path-traversal attacks where a malicious or typo'd path string is templated into committed workflow YAML.

#### Scenario: TS config imports BUILD constant

- **WHEN** `astro.config.ts` is inspected
- **THEN** it imports `BUILD` from `./build.config.ts` and references `BUILD.dist` for `outDir` and `BUILD.cache.astro` for `cacheDir`; no string literals like `'.build/dist'` appear directly in the config file.

#### Scenario: Path strings appear ONLY in SSoT files

- **WHEN** `git grep -E "(^|[^.])\.build/" -- ':!build.config.*' ':!*.md' ':!.gitignore' ':!.github/**' ':!lighthouserc.json' ':!lychee.toml'` runs
- **THEN** zero matches; non-SSoT, non-generated files reference paths only via the typed `BUILD` constant.

#### Scenario: JSON neutral form readable by Bazel

- **WHEN** `build.config.json` is parsed by any JSON-aware tool (jq, Python, Starlark)
- **THEN** the file is well-formed JSON containing only path strings — no comments, no JS expressions, no TS-only constructs — making it loadable from Starlark via `json.decode(read_file(...))` for future Bazel migration.

#### Scenario: tsconfig.json supports JSON loading

- **WHEN** `tsc --noEmit` runs against `build.config.ts`
- **THEN** the type check passes; `tsconfig.json` declares `resolveJsonModule: true` and `module: "NodeNext"`; the `BUILD` export is typed as `DeepReadonly<BuildPaths>` (`string`-typed leaves, NOT literal-string types — `JSON.parse(...) as BuildPaths` widens to `string`; consumers MUST NOT depend on literal-string narrowing).

#### Scenario: Path validator rejects traversal

- **WHEN** `scripts/sync-build-config.mjs` runs with a malicious `build.config.json` containing `"dist": "../../../etc/cron.d/x"` or any value with newline/backtick/`$()`/absolute prefix
- **THEN** the sync generator exits non-zero before writing any file; CI fails with "build.config.json: invalid path string".

### Requirement: Sync Generator and Drift Gate

`scripts/sync-build-config.mjs` MUST regenerate every JSON/YAML/TOML config that consumes BUILD paths from `build.config.json`. The script MUST be idempotent (re-running with no source change produces zero file system writes; verified by content-hash comparison before write). CI MUST run `npm run sync:build-config && git diff --exit-code` and fail the build if the post-sync diff is non-empty.

The script MUST regenerate at minimum: `lighthouserc.json` (paths from `build.config.json` + assertion shape from `scripts/fixtures/lhci-assertions.json` — the assertion fixture is the second source-of-truth governed by the redesign's `Lighthouse CI Performance Gate` Requirement; manual edits to `lighthouserc.json` are clobbered, assertion changes go through the fixture), `lychee.toml` (cache_path), `.github/workflows/deploy.yml` (path field only — see below), `.github/workflows/content-redeploy.yml` (cache mounts only), `.github/workflows/design-md-drift.yml` (cache mounts only).

**Deterministic output.** Every generated file MUST be byte-identical across machines/OSes/contributor runs. The generator MUST:

- Sort JSON keys lexicographically (or preserve `build.config.json` source order via a stable serializer) and emit LF-only line endings, UTF-8, no BOM, trailing newline.
- Use a single pinned YAML library (`yaml@2.5.x`) with explicit options (`lineWidth: 0`, `singleQuote: false`, `defaultStringType: 'PLAIN'`); write workflow YAML via targeted key rewrite that preserves comments and source key order, NOT a full-file regeneration.
- Use a pinned TOML library (`@iarna/toml@2.2.x`); alphabetize keys within sections.
- Post-process JSON/YAML/TOML through `prettier --parser <kind>` (project-pinned prettier version) for canonicalization.
- Emit a leading banner in every generated file: for JSON, a `"$generated": "build.config.json"` sentinel key; for YAML/TOML, a header comment `# AUTOGENERATED — do not edit. Source: build.config.json. Run: npm run sync:build-config`. CI MUST verify the banner SHA matches the current `build.config.json` SHA-256.

**Workflow YAML regen is targeted, not whole-file.** For `.github/workflows/*.yml`, the generator MUST update ONLY the specific keys that derive from BUILD. Targeted nodes are addressed via stable selectors keyed on a step's `name:` field (e.g., `jobs.deploy.steps[name="Upload Pages artifact"].with.path`). The targeted workflow steps MUST therefore carry a stable `name:` key; the generator MUST exit non-zero with "target step not found" if any expected selector misses. Implementation uses `yaml@2.5.x` Document API to mutate target nodes in place.

**Parse-stringify tolerance taxonomy.** `yaml@2.5.x` round-trips can reformat whitespace/quoting on untouched nodes. The generator MUST classify roundtrip-induced changes:

- TOLERATED (write proceeds): leading/trailing whitespace within a scalar, bare-vs-quoted scalar restyling that preserves the literal value, blank-line collapse outside step bodies, comment indentation normalization.
- FATAL (refuse to write, exit non-zero): any node-level addition, deletion, key-rename, value-mutation, or comment loss outside the explicitly-targeted node set. Determined via a structural-equivalence comparator (compare parsed AST minus the targeted nodes; trailing scalar-formatting diffs ignored).

**SHA-pinning enforcement.** The generator MUST refuse to emit any `uses:` line that is not pinned to a 40-character commit SHA with a trailing version comment (e.g., `actions/upload-pages-artifact@abc123…full-sha # v3.0.1`). Floating tags (`@v3`, `@main`) are rejected. The enforcement is **emit-side**: the generator validates only the lines IT writes; it does NOT block on non-targeted lines that already use floating tags. A separate Phase-3 pre-pin pass (Tasks 3.7–3.8) MUST convert every existing floating-tag `uses:` line in `.github/workflows/*.yml` to a 40-char SHA pin BEFORE the first sync run; the round-1 generator otherwise breaks at apply time. Dependabot configuration (`.github/dependabot.yml`) is REQUIRED with `package-ecosystem: github-actions`, `directory: /`, `schedule.interval: weekly`, `groups.actions.patterns: ["*"]` to keep pins current.

**CI write-block.** The sync generator MUST refuse to write workflow YAML when running under `GITHUB_ACTIONS=true`; sync mutations to `.github/` MUST originate from human-driven local invocation, not CI write-back. CI's drift gate runs sync in a read-only verification mode that diffs without committing.

**Pre-commit safety net.** The repo MUST configure a pre-commit hook (via `husky` or `lefthook`) that runs `npm run sync:build-config` and aborts the commit if the post-sync diff is non-empty. `SKIP_BUILD_SYNC=1` opt-out applies to the hook only when explicitly set per-commit.

The script MUST run unit tests asserting byte-identical output across 10 successive invocations on the same input, verifying determinism.

#### Scenario: Sync is idempotent

- **WHEN** `npm run sync:build-config` runs twice in succession with no `build.config.json` change
- **THEN** the second run produces zero file writes (mtime on generated files unchanged).

#### Scenario: Drift gate fails on stale generated files

- **WHEN** a contributor edits `build.config.json` and commits without running `sync:build-config`
- **THEN** CI runs `npm run sync:build-config && git diff --exit-code`; the diff is non-empty; the build fails with "build config drift — run `npm run sync:build-config` locally and commit."

#### Scenario: Sync respects opt-out

- **WHEN** `SKIP_BUILD_SYNC=1 npm run build` runs (a hot-loop dev iteration)
- **THEN** the prebuild hook detects the env var and exits 0 without regenerating; documented in `docs/build-artifacts.md`.

### Requirement: prebuild and predev Lifecycle Hooks

`package.json` MUST declare both a `prebuild` script and a `predev` script that run `node scripts/sync-build-config.mjs` BEFORE `astro build` and BEFORE `astro dev` respectively. When other prebuild work exists (favicon and logo generation from `add-brand-assets-and-writing-pipeline`), the chain MUST run sync FIRST so dependent generators consume up-to-date paths.

To avoid implicit ordering coupling between this change and `add-brand-assets-and-writing-pipeline`, both changes MUST target a single named npm script `build:prebuild-chain` that orchestrates the ordered sequence (sync → favicons → logos). The `prebuild` lifecycle hook delegates to `build:prebuild-chain`. State table:

| Archive state                                   | `build:prebuild-chain` body                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Only this change archived                       | `npm run sync:build-config`                                                  |
| This + brand-assets archived (this lands FIRST) | `npm run sync:build-config && npm run build:favicons && npm run build:logos` |
| Brand-assets archives first (this in flight)    | NOT PERMITTED — see ordering constraint below                                |

**Ordering constraint.** This change MUST archive BEFORE `add-brand-assets-and-writing-pipeline`. The state-table row "brand-assets first, this in flight" is forbidden because retroactively editing an archived change is impossible — `build:prebuild-chain` would land in `package.json` without the leading `sync:build-config` step and brand-assets' apply-phase commit would be the wrong place to insert it. The merge-order gate MUST enforce this via `openspec validate --strict` failing if both changes are simultaneously in flight without a documented dependency arrow pointing brand-assets → standardize-build-artifacts. The `openspec/changes/add-brand-assets-and-writing-pipeline/proposal.md` "Risks and Rollback" section MUST cite this dependency.

**Dev-loop fast path.** `predev` runs sync on every `npm run dev` start. To keep restart cycles snappy, the generator MUST implement an mtime fast-path: if no input file (`build.config.json`, `package-lock.json`, `tsconfig.json`) is newer than the youngest generated output file (`lighthouserc.json`, `lychee.toml`, `.github/workflows/*.yml`), the generator MUST exit 0 in under 5 ms without parsing any input. The full content-hash check runs only when mtimes are stale. `SKIP_BUILD_SYNC=1` remains the documented hot-loop escape hatch for cases where even the fast path is too slow.

#### Scenario: prebuild runs sync first

- **WHEN** `npm run build` is invoked
- **THEN** `scripts/sync-build-config.mjs` executes BEFORE `astro build`; `BUILD.dist` resolves to `.build/dist`; the build emits its output there.

#### Scenario: predev runs sync before dev server

- **WHEN** `npm run dev` is invoked after a contributor edits `build.config.json`
- **THEN** sync runs first; the dev server starts with up-to-date generated configs; Lighthouse / Lychee / workflow YAML reflect the new paths immediately, not on the next `build`.

#### Scenario: prebuild chains are ordered

- **WHEN** both this change and `add-brand-assets-and-writing-pipeline` are archived
- **THEN** `build:prebuild-chain` runs `sync:build-config` first, then `build:favicons`, then `build:logos`; `prebuild` delegates to `build:prebuild-chain` then `astro build` runs.

### Requirement: Clean Scripts

`package.json` MUST declare three clean scripts:

- `npm run clean` — removes `.build/` entirely.
- `npm run clean:cache` — removes only `.build/cache/`.
- `npm run clean:reports` — removes only `.build/reports/`.

**ALL THREE clean scripts** MUST guard against mid-run races. Playwright + Lighthouse runners write reports incrementally; Playwright's install cache (`PWTEST_CACHE_DIR=.build/cache/playwright`) is mutated during browser-binary install; `clean` and `clean:cache` deleting either path mid-test crashes the runner. Lock semantics:

- A single sentinel `.build/.run.lock` covers BOTH cache and reports (a test run touches both surfaces). Lives at `.build/.run.lock`, not `.build/reports/.run.lock`.
- Acquire: test runner integrations (Playwright `globalSetup`, LHCI wrapper) MUST `await fs.promises.mkdir('.build', { recursive: true })` then `fs.openSync('.build/.run.lock', 'wx')` (O_CREAT | O_EXCL). The two-step is atomic on POSIX once `.build/` exists; on first-ever invocation the mkdir is the only race window and is idempotent. The lock content MUST be the runner's PID + start timestamp.
- Release: `globalTeardown` `unlinkSync` the lock unconditionally.
- Stale-lock detection: if `wx` open fails with `EEXIST`, read the lock file's PID; if the PID is no longer running OR the lock mtime is older than 2 hours, atomic-replace via `fs.openSync(tmp, 'wx')` + `rename`. PID-based ownership prevents the 2-hour TTL from being weaponized into a "wait two hours then clean" attack window.
- All three clean scripts (`clean`, `clean:cache`, `clean:reports`) MUST consult `.build/.run.lock` and exit non-zero with "tests in flight; refusing to delete <path>" when held by a live PID.

#### Scenario: clean nukes everything

- **WHEN** a contributor runs `npm run clean`
- **THEN** `.build/` does not exist on disk; `node_modules` is untouched.

#### Scenario: clean:cache preserves reports

- **WHEN** a contributor runs `npm run clean:cache` after a test run that produced reports
- **THEN** `.build/cache/` is gone but `.build/reports/playwright/` still contains the test results.

#### Scenario: clean variants refuse while tests run

- **WHEN** `npm run clean`, `npm run clean:cache`, or `npm run clean:reports` is invoked while `.build/.run.lock` exists with a live PID
- **THEN** the script exits non-zero with "tests in flight; refusing to delete <path>" and the target tree is untouched.

#### Scenario: Stale lock with dead PID is cleared

- **WHEN** a clean script encounters `.build/.run.lock` whose PID is no longer running
- **THEN** the script atomically replaces the lock and proceeds with the cleanup; no spurious refusal due to crashed runs.

### Requirement: CI Artifact Upload and Cache Strategy

The CI workflow that runs Playwright + Lighthouse MUST upload `.build/reports/` as a single GitHub Actions artifact named `reports-${{ github.sha }}` with `if: always()` so reports are accessible regardless of test outcome. The upload step MUST set `retention-days: 14` to bound storage growth against the 2 GB org artifact quota.

The CI cache step that mounts `.build/cache/` MUST use a semantic cache key that does NOT include cache contents. The key MUST be derived from `hashFiles('build.config.json', 'package-lock.json')`; `restore-keys` MAY add tool-version pins. Hashing `.build/cache/**` itself is forbidden — it produces a tautological self-hash that never invalidates.

Playwright traces uploaded as artifacts MUST NOT contain real credentials. `playwright.config.ts` MUST configure trace/HAR sanitization to strip `Authorization`, `Cookie`, and `Set-Cookie` header values before persisting.

#### Scenario: Reports uploaded on failure

- **WHEN** a CI run fails because Playwright tests fail
- **THEN** the workflow still uploads `.build/reports/` as an artifact with `retention-days: 14`; the failed run's PR shows the artifact link in the run summary.

#### Scenario: Reports uploaded on success

- **WHEN** a CI run passes
- **THEN** `.build/reports/` is uploaded with `retention-days: 14`; reviewers can download to inspect Lighthouse + Playwright HTML reports.

#### Scenario: Cache key is content-derived, not self-hashed

- **WHEN** the CI workflow's cache step is inspected
- **THEN** `key:` resolves to `hashFiles('build.config.json', 'package-lock.json')` (or includes those files); the key does NOT include `hashFiles('.build/cache/**')` or any other glob over the cache contents themselves.

### Requirement: CODEOWNERS Dual-Review for Generator-Adjacent Files

`CODEOWNERS` MUST require **two distinct human reviewers** for the set of files that compose the SSoT generator surface: `build.config.json`, `build.config.ts`, `scripts/sync-build-config.mjs`, and every file in `.github/workflows/`. A contributor PR that edits `build.config.json` effectively edits CI workflow YAML via the generator; a single-reviewer rubber-stamp on `build.config.json` would bypass `.github/` review. Dual review on both surfaces closes the workflow-injection vector.

**Team handle policy.** If the org has a `@artagon/security` team, CODEOWNERS encodes `@artagon/security @artagon/maintainers` for the listed paths. If no `@security` team exists, CODEOWNERS encodes the two highest-trust individual maintainers (e.g., `@trumpyla @<co-maintainer>`); the spec MUST NOT ship with a phantom team handle that fails open. Phase 0 verification (Task 0.3a) MUST run `gh api orgs/artagon/teams 2>/dev/null | jq '.[].slug'` to list real teams; if no `security` slug appears, the substitution rule applies. Branch protection MUST set `required_approving_review_count: 2` and `require_code_owner_reviews: true`.

The drift gate's CI write-block (sync refuses to write under `GITHUB_ACTIONS=true`) is a defense-in-depth complement to the CODEOWNERS rule, not a substitute.

#### Scenario: build.config.json edit requires two reviewers

- **WHEN** a PR edits `build.config.json`
- **THEN** GitHub branch protection requires approval from two distinct CODEOWNERS-listed reviewers before merge; CODEOWNERS encodes either `@artagon/security @artagon/maintainers` (if both teams exist) or two named individuals (fallback).

#### Scenario: Phantom team detection

- **WHEN** Phase 0.3a runs `gh api orgs/artagon/teams` and the listed handles in CODEOWNERS do not appear in the response
- **THEN** the task fails non-zero with "CODEOWNERS team handles not found in org; substitute named individuals"; the change does not archive until resolved.

#### Scenario: Workflow YAML edit requires two reviewers

- **WHEN** a PR edits any file under `.github/workflows/` (whether human-authored or sync-regenerated)
- **THEN** the same dual-reviewer CODEOWNERS rule applies.

### Requirement: Bazel-Readiness Hooks

`build.config.json` MUST be the only data file required for a future Bazel adoption to consume the same paths. The JSON MUST contain only string-valued paths (no JS expressions, no environment-variable interpolation, no schema beyond plain object/string nesting). A future `build_paths.bzl` adapter MUST be implementable with `json.decode(read_file("//:build.config.json"))` returning a Starlark struct equivalent to the TS `BUILD` constant.

#### Scenario: JSON is loadable from Starlark

- **WHEN** a future contributor authors `build_paths.bzl` with `json.decode(read_file("//:build.config.json"))`
- **THEN** the resulting Starlark struct exposes the same field tree (`.dist`, `.cache.astro`, `.reports.playwright.results`, etc.) as the TS `BUILD` constant.

#### Scenario: No TS-only constructs in JSON source

- **WHEN** `build.config.json` is parsed by `jq` or Python's `json.load`
- **THEN** the parse succeeds; no comments, no trailing commas, no JS-specific syntax.
