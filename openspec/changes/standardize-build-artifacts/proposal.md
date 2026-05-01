## Why

Today the project's build, cache, and report artifacts are scattered across the repo root: `dist/`, `.astro/`, `.lighthouseci/`, `test-results/`, `playwright-report/`, `playwright/.cache/`, `.cache/content-repo/`, `.tree-sitter/`, `.playwright-mcp/`, plus a committed `openspec/.cache/design-md-spec.md`. The `.gitignore` carries 5+ separate entries; `npm run clean` does not exist; CI cache keys hash several disjoint paths. Each tool's config (`astro.config.mjs`, `playwright.config.ts`, `lighthouserc.json`, `lychee.toml`, `.github/workflows/*.yml`, `package.json` scripts) hardcodes its own path, so a relocation requires N coordinated edits.

This change consolidates all runtime artifacts under `.build/` (cache + reports + dist), establishes a single `build.config.ts` source-of-truth that TS-aware tools import directly, and a `scripts/sync-build-config.mjs` generator that writes derived JSON/YAML/TOML configs for tools that don't import TS (Lighthouse CI, Lychee, GitHub Actions, ast-grep). A CI drift gate fails the build if generated configs diverge from the source.

The change lands AFTER the three in-flight changes (`adopt-design-md-format`, `update-site-marketing-redesign`, `add-brand-assets-and-writing-pipeline`) so they can adopt the new path constants when their `/opsx:apply` runs.

## What Changes

- **Establish `.build/` umbrella** with three top-level subdirs: `cache/` (reusable, CI-cacheable), `reports/` (per-run artifacts uploaded to CI), `dist/` (deploy artifact).
- **Create `build.config.ts`** at repo root exporting a typed `BUILD` constant (`as const satisfies BuildPaths`) covering every path. Tools that accept TS/JS configs (`astro.config.mjs`, `playwright.config.ts`) MUST import from it — no string literals duplicated.
- **Create `scripts/sync-build-config.mjs`** that generates `lighthouserc.json`, `lychee.toml`, `.github/workflows/deploy.yml` `path:` field, and any other JSON/YAML/TOML config from `BUILD`. Wired into `prebuild` lifecycle hook so local builds stay in sync.
- **CI drift gate**: `npm run sync:build-config && git diff --exit-code` runs in CI; non-empty diff = build fails with "build config drift — run sync:build-config locally and commit."
- **Standardize `clean` scripts**: `npm run clean` (nukes `.build/`), `clean:cache` (`.build/cache/`), `clean:reports` (`.build/reports/`). Replaces ad-hoc `rm -rf` patterns.
- **Collapse `.gitignore`**: 5 path entries → single `.build/` line.
- **GitHub Pages deploy** workflow updated to upload `.build/dist/` (was `dist/`).
- **OpenSpec spec cache stays put** at `openspec/.cache/design-md-spec.md` — committed agent-context per `adopt-design-md-format` Decision #4. The cache file is OUTSIDE `.build/` because it's a committed deliverable, not a runtime artifact.
- **Public deliverables stay put**: `public/assets/logos/*.png`, `public/favicon.svg`, `public/icon-{192,512}.png`, `public/apple-touch-icon.png`, `public/mask-icon.svg`. They live in `public/` because Astro copies that into `dist/` during build.
- **Tree-sitter grammars are excluded from `BUILD.cache`.** Grammars are contributor-machine concerns (arch-specific binaries, editor/IDE managed) and MUST NOT be installed at the repo level. The `.gitignore` collapse drops `.tree-sitter/` from the project-level entry list — contributors who use tree-sitter locally configure it via their global home directory or editor cache.
- **CODEOWNERS dual-review** for the SSoT generator surface: `build.config.json`, `build.config.ts`, `scripts/sync-build-config.mjs`, `.github/workflows/*.yml`. Closes the workflow-injection vector where a single-reviewer rubber-stamp on `build.config.json` could bypass `.github/` review via the generator pathway.
- **Path-traversal validator** in the sync generator: every value in `build.config.json` MUST match `^\.build/[a-z0-9/_-]+$`; sync exits non-zero on `..`, newline, backtick, `$()`, or absolute prefixes BEFORE writing any output file.
- **SHA-pinned Actions** enforced by sync: any `uses:` line emitted in generated workflow YAML MUST be 40-char SHA-pinned with trailing `# vX.Y.Z` version comment. Floating tags (`@v3`, `@main`) rejected. Dependabot config keeps pins current.
- **Targeted YAML mutation** for workflow regen: sync mutates only specific keys (e.g., `path:` value) using `yaml@2.5.x` Document API; never whole-file rewrite. Refuses to write if any non-targeted node changes during parse-stringify roundtrip.
- **`clean:reports` race-guard** via `.build/reports/.run.lock` sentinel: test runners acquire on start, release on exit; clean script refuses while lock held.
- **CI cache key** is content-derived: `hashFiles('build.config.json', 'package-lock.json')` — never `hashFiles('.build/cache/**')` (tautological self-hash).
- **Artifact retention** bounded: `retention-days: 14` on the `.build/reports/` upload step to bound storage growth against the 2 GB org artifact quota.
- **Pre-commit hook** (husky/lefthook) runs sync + diff-check; aborts commit on drift. `SKIP_BUILD_SYNC=1` opt-out per-commit.
- **CI write-block**: sync refuses to write under `GITHUB_ACTIONS=true`; CI's drift gate runs sync in read-only `--check` mode.

## Scope Boundaries

**In Scope:**

- Tool config edits: `astro.config.mjs` (`outDir` + `cacheDir`), `playwright.config.ts` (`outputDir` + `reporter[html].outputFolder` + `PWTEST_CACHE_DIR`), `lighthouserc.json` (`assert.outputDir`, `upload.outputDir`), `lychee.toml` (`cache_path`), `.github/workflows/deploy.yml` (`path:`), `.github/workflows/content-redeploy.yml` (`path:` if applicable), `.github/workflows/design-md-drift.yml` (cache mount points), `package.json` (clean scripts + sync hook).
- New files: `build.config.ts`, `scripts/sync-build-config.mjs`, `tests/build-config.spec.ts` (drift-gate test).
- `.gitignore` collapse.
- Documentation: `docs/build-artifacts.md` covering layout, sync flow, contributor add-tool checklist.
- Spec deltas under `build-config` (new cap) and `check-site-quality` (MODIFIED — new test paths).

**Out of Scope:**

- **No move of `public/assets/logos/*.png` or favicons.** They are deploy deliverables in `public/`, copied by Astro into `dist/` (now `.build/dist/`). Moving them under `.build/` would break the deploy artifact path.
- **No move of `openspec/.cache/design-md-spec.md`.** Per Decision below, the OpenSpec spec cache is a committed agent-context file, not a runtime artifact.
- **No move of `tests/fixtures/`.** Source code, not generated.
- **No Bazel adoption.** YAGNI — single-package repo. The `build.config.ts` design preserves a future Bazel migration path (Bazel can load a JSON neutral form) but does not commit to it now.
- **No new tools.** Vitest, Storybook, etc. not in scope. New tools added later follow the contributor checklist in `docs/build-artifacts.md`.
- **No npm workspaces / monorepo setup.** Single package stays single package.
- **No Nx/Turborepo cache layer.** Future consideration if a second package joins.

## Risks and Rollback

- **Risk: GitHub Pages deploy breaks because `path:` change is wrong.** `actions/upload-pages-artifact@<sha>` defaults to `./dist`. Override to `./.build/dist`. **Mitigation:** PR-preview deploy verifies before merge; rollback = revert the workflow YAML edit (one-line revert).
- **Risk: TS config import requires a build step.** `astro.config.mjs` is `.mjs`, not `.ts` — importing `build.config.ts` requires either `.ts` extension support or pre-compilation. **Mitigation:** Astro 5 supports `.mts`/`.ts` config files (`astro.config.ts`); the change renames `astro.config.mjs` → `astro.config.ts`. Or use `defineConfig({ ... })` with a JSON-shaped `build.config.json` that both TS and Starlark can read. Spec mandates the latter (JSON neutral form) for future Bazel-readiness.
- **Risk: `prebuild` sync hook adds latency to every `npm run build`.** Hook runs sync (~50 ms reads + writes) every build. **Mitigation:** sync is a no-op when generated files are up to date (compares hashes); cost is negligible. Skip via `SKIP_BUILD_SYNC=1` for hot loops if needed.
- **Risk: Drift gate produces false positives if a tool auto-mutates its config (e.g., `.lighthouseci/.last-run` writeback).** **Mitigation:** sync script generates ONLY the human-edited config, not the runtime caches. Lighthouse CI's runtime state lives under `.build/cache/lhci/` (gitignored) and never collides with the generated `lighthouserc.json`.
- **Risk: Existing scripts/CI in this repo reference old paths (`dist/`, `playwright-report/`, etc.).** **Mitigation:** Phase 0 inventory + grep finds every reference. Before merge: every reference is updated, `git grep -E "(^|[^.])dist/|playwright-report|test-results|\.lighthouseci"` returns 0 hits outside generated configs.
- **Risk: `build.config.ts` import in `astro.config.ts` creates circular dependency** if `build.config.ts` ever needs Astro types. **Mitigation:** `build.config.ts` is path-strings ONLY (no Astro imports); pure data file.
- **Risk: Three in-flight changes already reference old paths in their tasks/specs.** **Mitigation:** This change lands BEFORE `/opsx:apply` runs on any of them; each consumer change adopts the new paths during its own apply phase. A Phase 1 inventory captures the cross-references.
- **Rollback**: revert in reverse phase order: (1) revert `package.json` clean+sync scripts; (2) revert tool config edits; (3) restore old `.gitignore` entries; (4) delete `build.config.ts` + sync script; (5) revert spec deltas. The `dist/` → `.build/dist/` move is the only deploy-affecting step; revert that workflow edit independently.

## Impact

- **Affected Specs:**
  - `build-config` — **New Capability** (single source of truth, generated configs, drift gate, .build/ layout, clean scripts).
  - `check-site-quality` — **MODIFIED** (Playwright + Lighthouse output paths move under `.build/reports/`).

- **Affected Code:**
  - `build.config.ts` (new) — typed `BUILD` constant, single source of truth.
  - `build.config.json` (new, generated by sync from build.config.ts) — neutral form for non-TS tools and future Bazel adapter.
  - `scripts/sync-build-config.mjs` (new) — generator for JSON/YAML/TOML configs.
  - `astro.config.mjs` → `astro.config.ts` (rename + import BUILD; `outDir: BUILD.dist`, `cacheDir: BUILD.cache.astro`).
  - `playwright.config.ts` (edit; import BUILD; `outputDir`, `reporter[html].outputFolder`).
  - `lighthouserc.json` (generated; assertions + outputDir from BUILD).
  - `lychee.toml` (generated; cache_path from BUILD).
  - `.github/workflows/deploy.yml` (edit; `path: .build/dist`).
  - `.github/workflows/content-redeploy.yml` (edit; reuse deploy paths).
  - `.github/workflows/design-md-drift.yml` (edit; cache paths).
  - `package.json` (scripts: `clean`, `clean:cache`, `clean:reports`, `sync:build-config`, `prebuild` hook).
  - `tests/build-config.spec.ts` (new) — drift gate Playwright assertion.
  - `.gitignore` (collapse to `.build/` + `node_modules` + `.env` + `.DS_Store`).
  - `docs/build-artifacts.md` (new) — layout + contributor add-tool checklist.
  - Cleanup: delete `dist/` from root if empty, remove `test-results/`, `playwright-report/`, `.lighthouseci/`, `.cache/`, `.tree-sitter/`, `.playwright-mcp/` from `.gitignore` (now under `.build/`).

- **Affected Docs:**
  - `README.md` — link to `docs/build-artifacts.md`; update any `dist/` references.
  - `AGENTS.md` — note `.build/` umbrella in the build-and-deploy section.
  - `openspec/project.md` — capability inventory updated with `build-config`.
  - `docs/decisions/0001-no-tailwind.md` — no edits (orthogonal).
