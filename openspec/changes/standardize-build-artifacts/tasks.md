# Tasks — standardize-build-artifacts

> Each task lists files touched + acceptance signal. Phases land in order; tasks within a phase MAY parallelize.

## Phase 0 — Pre-flight

- [ ] 0.1 `openspec validate standardize-build-artifacts --strict` passes.
- [ ] 0.2 Inventory: `git grep -n -E "(^|[^.])dist/|playwright-report|test-results|\.lighthouseci|\.cache/content-repo|\.tree-sitter|\.playwright-mcp|playwright/\.cache" -- ':!*.md' ':!build.config.*'` records baseline references. Save to `~/.workspace/standardize-build-artifacts/baseline-refs.txt` for round-trip diff after Phase 5.
- [ ] 0.3 Confirm CODEOWNERS includes `build.config.ts`, `build.config.json`, `scripts/sync-build-config.mjs`, `astro.config.ts`, `playwright.config.ts`, `lighthouserc.json`, `.github/workflows/*.yml`, `.gitignore`, `package.json`.
- [ ] 0.4 Verify NO in-flight changes (three prerequisites in PR #28) reference the new `BUILD.*` constants yet — they consume new paths during their own apply phase, not now. Spec validates GREEN before this change merges.

## Phase 1 — Source-of-truth files

- [ ] 1.1 Create `build.config.json` at repo root with the canonical paths object per `design.md` Decision #2.
- [ ] 1.2 Create `build.config.ts` exporting typed `BUILD` constant via `as const satisfies BuildPaths`. Imports `build.config.json` with `import data from './build.config.json' with { type: 'json' };` (Node 22 native JSON-modules; works in TS via `tsconfig.json` `resolveJsonModule: true`).
- [ ] 1.3 Add `BuildPaths` interface to `build.config.ts` with all path fields typed `string`.
- [ ] 1.4 Verify `tsc --noEmit` (or `astro check`) accepts the typed import: `cat build.config.ts && rtk npx tsc --noEmit build.config.ts` exits 0.

## Phase 2 — Sync generator

- [ ] 2.1 Create `scripts/sync-build-config.mjs`. Inputs: `build.config.json`. Outputs (overwrites with content-hash skip when unchanged):
  - `lighthouserc.json` (assertions + outputDirs from BUILD)
  - `lychee.toml` (cache_path from BUILD.cache.content)
  - `.github/workflows/deploy.yml` (`path:` field updated for upload-pages-artifact)
  - `.github/workflows/content-redeploy.yml` (deploy step + cache mount paths)
  - `.github/workflows/design-md-drift.yml` (cache mount paths)
- [ ] 2.2 Sync writes are idempotent: re-running with no `build.config.json` change produces zero file system changes (verified via `mtime` on outputs).
- [ ] 2.3 Sync respects `SKIP_BUILD_SYNC=1` env var (no-op exit 0). Document in `docs/build-artifacts.md`.
- [ ] 2.4 Add `npm run sync:build-config` script. Wire as `prebuild` lifecycle hook (chained with existing `prebuild` content from `add-brand-assets-and-writing-pipeline` if archived: `node scripts/sync-build-config.mjs && npm run build:favicons && npm run build:logos`).

## Phase 3 — Tool config edits (TS imports)

- [ ] 3.1 `git mv astro.config.mjs astro.config.ts` (preserves blame). Edit: `import { BUILD } from './build.config.ts'`; set `outDir: BUILD.dist`, `cacheDir: BUILD.cache.astro`.
- [ ] 3.2 Edit `playwright.config.ts`: `import { BUILD } from './build.config.ts'`; set `outputDir: BUILD.reports.playwright.results`, `reporter: [['html', { outputFolder: BUILD.reports.playwright.html }]]`.
- [ ] 3.3 Set `PWTEST_CACHE_DIR=.build/cache/playwright` in CI workflow env (Playwright respects this env var for its install cache).
- [ ] 3.4 Verify `astro build` produces output under `.build/dist/` (not `dist/`). Verify `playwright test` writes results to `.build/reports/playwright/results/`. Both commands exit 0.

## Phase 4 — Tool config edits (generated)

- [ ] 4.1 Run `npm run sync:build-config`. Confirm `lighthouserc.json`, `lychee.toml`, workflow YAMLs are written with `BUILD.*`-derived paths.
- [ ] 4.2 Commit generated outputs.
- [ ] 4.3 Run `git diff --exit-code` on generated files immediately after a fresh sync run; expect zero output (drift gate validates itself).
- [ ] 4.4 Update `lighthouserc.json` `assertMatrix` per redesign + brand-gallery requirements (matchingUrlPattern for `/brand` ≥0.8, marketing routes ≥0.9). Sync regenerates this from `build.config.json` plus the static assertion shape.

## Phase 5 — npm scripts + .gitignore

- [ ] 5.1 Add `package.json` scripts: `clean: rm -rf .build`, `clean:cache: rm -rf .build/cache`, `clean:reports: rm -rf .build/reports`, `sync:build-config: node scripts/sync-build-config.mjs`.
- [ ] 5.2 Update `package.json` `prebuild` to chain `sync:build-config` before any other prebuild work.
- [ ] 5.3 Collapse `.gitignore`: remove `dist/`, `.astro/`, `.lighthouseci/`, `test-results/`, `playwright-report/`, `playwright/.cache/`, `.cache/`, `.tree-sitter/`, `.playwright-mcp/` entries; replace with single `.build/` line. Keep `node_modules`, `.env`, `.DS_Store`, fixture-cache lines.
- [ ] 5.4 Sweep references: `git grep` for old paths in source files (NOT specs/proposals/design.md, those are historical records). Update each to `BUILD.*` import or relative path under `.build/`.
- [ ] 5.5 Compare against Phase 0.2 baseline. Net diff: only the SSoT files + sync-generated configs reference paths; everywhere else imports from `build.config.ts`.

## Phase 6 — In-flight change cross-references

- [ ] 6.1 Audit `openspec/changes/{adopt-design-md-format,update-site-marketing-redesign,add-brand-assets-and-writing-pipeline}/tasks.md` for hardcoded paths that will move under `.build/` (`dist/`, `playwright-report/`, `.lighthouseci/`, etc.). Each occurrence MUST be left as historical authoring text — do NOT mutate other changes' files (per the openspec authoring rule learned in `adopt-design-md-format`'s round-2 review).
- [ ] 6.2 Add a cross-link note in `openspec/project.md`: "All four in-flight changes' /opsx:apply phases consume `BUILD.*` constants from `build.config.ts` instead of hardcoded strings. The path constants are stable; the SSoT is `build.config.json`."
- [ ] 6.3 No edits to other changes' files. The other three changes adopt the new paths during their own apply phase (when they touch the affected configs/scripts). This change lands its SSoT first; they consume it later.

## Phase 7 — Drift-gate test

- [ ] 7.1 Author `tests/build-config.spec.ts` (Playwright) — runs `npm run sync:build-config && git diff --exit-code` and asserts exit 0. Wire into CI `test:ci` step.
- [ ] 7.2 Author negative test fixture: a script that mutates `build.config.json`, runs sync, asserts `git diff --exit-code` exits NON-zero. Reverts mutation. Confirms drift gate works.
- [ ] 7.3 Add CI assertion `git grep -E "(^|[^.])dist/" -- ':!build.config.*' ':!*.md' ':!openspec/changes/*' ':!docs/*'` returns 0 hits — no source code references old paths.

## Phase 8 — Documentation

- [ ] 8.1 Author `docs/build-artifacts.md` with REQUIRED sections:
  - Layout overview (`.build/{cache,reports,dist}` table).
  - SSoT contract: `build.config.json` is canonical; `build.config.ts` is its TS wrapper; tools either IMPORT or are GENERATED.
  - Generated-file list (lighthouserc.json, lychee.toml, deploy.yml `path`).
  - "Add a tool" contributor checklist: (1) decide TS-import vs JSON-generate; (2) edit `build.config.json` with new paths; (3) run `npm run sync:build-config`; (4) commit the SSoT diff + generated diffs together.
  - `clean`/`clean:cache`/`clean:reports` semantics.
  - Future Bazel migration path (load `build.config.json` via Starlark).
- [ ] 8.2 Update `README.md` with link to `docs/build-artifacts.md`.
- [ ] 8.3 Update `AGENTS.md` "Build and Deploy" subsection: mention `.build/` umbrella + SSoT.

## Phase 9 — Quality gates

- [ ] 9.1 `openspec validate --strict` passes for this change AND for the three in-flight prerequisite changes (no path-collision regression).
- [ ] 9.2 `rtk npm run build` produces output under `.build/dist/`; manual `ls -la .build/` confirms three subdirs (cache, reports, dist).
- [ ] 9.3 `rtk npm run clean && rtk npm run build` produces an identical `.build/dist/` SHA-tree (deterministic build).
- [ ] 9.4 `rtk npm run lint:sg:ci` passes — no violations of `no-inner-html`, `no-set-html-directive`, etc., introduced by config edits.
- [ ] 9.5 `rtk npm run sync:build-config && git diff --exit-code` exits 0 (drift gate validates itself).
- [ ] 9.6 `rtk npm run test:ci` (Playwright) emits results to `.build/reports/playwright/`, no leftover output in `test-results/` or `playwright-report/`.
- [ ] 9.7 PR-preview Pages deploy uploads `.build/dist/` and renders correctly.
- [ ] 9.8 GitHub Actions artifact upload step lists `.build/reports/` after a deliberate test failure (verify CI artifact pipeline works end-to-end).

## Phase 10 — Archive

- [ ] 10.1 `openspec archive standardize-build-artifacts --yes` after deploy verification.
- [ ] 10.2 `openspec/specs/build-config/spec.md` Purpose line replaced (no longer "TBD").
- [ ] 10.3 Verify `check-site-quality/spec.md` reflects MODIFIED requirements (Playwright + Lighthouse output paths).
- [ ] 10.4 No follow-up change scaffold needed; future tool additions follow the contributor checklist.

## Parallelism notes

- Phase 1 + 2 can author in parallel (build.config.\* + sync script).
- Phase 3 (TS imports) and Phase 4 (generated) can run in parallel after Phase 1+2.
- Phase 5 depends on Phase 3+4 (scripts + .gitignore reference new paths).
- Phase 6 is documentation-only; can start any time after Phase 1.
- Phase 7 (drift test) gates on Phase 4 (generated configs exist).
- Phase 8 (docs) can start any time after Phase 1.

## Rollback

Reverse phase order:

1. Revert Phase 7 drift test.
2. Revert Phase 5 npm scripts + .gitignore.
3. Revert Phase 4 generated configs.
4. Revert Phase 3 TS config edits (rename astro.config.ts back to .mjs via `git mv`).
5. Delete `scripts/sync-build-config.mjs`.
6. Delete `build.config.ts` + `build.config.json`.
7. Revert spec deltas.

The deploy-affecting step (Phase 4 workflow YAML edit) reverts independently of the rest.
