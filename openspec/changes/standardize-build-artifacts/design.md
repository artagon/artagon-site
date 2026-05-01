## Context

Build artifacts scattered across repo root: `dist/`, `.astro/`, `.lighthouseci/`, `test-results/`, `playwright-report/`, `playwright/.cache/`, `.cache/content-repo/`, `.tree-sitter/`, `.playwright-mcp/`. Six `.gitignore` entries. Each tool's path hardcoded in its own config. Adding a tool means N more entries + N more configs to keep aligned.

This change consolidates everything under `.build/` and centralizes path declarations in `build.config.ts`. JSON-only configs (Lighthouse CI, Lychee) are generated from a JSON neutral form (`build.config.json`) so a future Bazel migration can load the same source via Starlark.

## Goals / Non-Goals

### Goals

- Single source of truth for all build/cache/report paths.
- Type-safe path lookups in TS configs (no string drift).
- One `.gitignore` line.
- One `npm run clean` that nukes everything reproducible.
- CI cache key = `hashFiles('build.config.json', 'package-lock.json')` (content-derived; never `hashFiles('.build/cache/**')` self-hash tautology).
- Per-run reports uploaded as a single CI artifact (`.build/reports/`).
- Future-proof for Bazel adoption (JSON neutral form, no TS lock-in for path data).

### Non-Goals

- No move of public/ deliverables (favicons, logo PNGs).
- No move of OpenSpec spec cache (committed agent-context, not runtime).
- No npm workspaces / monorepo conversion.
- No Vitest, Storybook, or other tool additions.
- No Bazel adoption today (only the data-format affordance for it).

## Decisions

### 1. Three top-level `.build/` subdirs: `cache/`, `reports/`, `dist/`

Distinct semantics drive distinct subdirs:

| Subdir            | Lifetime             | CI behavior               | Local cleanup                                            |
| ----------------- | -------------------- | ------------------------- | -------------------------------------------------------- |
| `.build/cache/`   | reusable across runs | hash → CI cache key       | `npm run clean:cache` (fast iter without losing reports) |
| `.build/reports/` | per-run output       | always upload as artifact | `npm run clean:reports`                                  |
| `.build/dist/`    | per-deploy artifact  | upload to Pages           | always rebuilt                                           |

Splitting these prevents a "clean cache" from nuking a useful test report, and lets CI use a single artifact-upload glob (`.build/reports/**`) without including caches.

### 2. `build.config.ts` typed source of truth

```typescript
// build.config.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface BuildPaths {
  root: string;
  cache: {
    astro: string;
    content: string;
    lhci: string;
    lychee: string;
    playwright: string;
    treeSitter: string;
    playwrightMcp: string;
  };
  reports: {
    playwright: { results: string; html: string };
    lhci: string;
    coverage: string;
  };
  dist: string;
}

type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

const data = JSON.parse(
  readFileSync(join(__dirname, "build.config.json"), "utf8"),
) as BuildPaths;

export const BUILD: DeepReadonly<BuildPaths> = data;
// Validate at module-load time; throws if shape drifts.
const _validate: BuildPaths = data satisfies BuildPaths;
```

**Why `readFileSync` + `JSON.parse` instead of `import data from './build.config.json' with { type: 'json' }`:** the `with` import-attribute syntax requires `module: "NodeNext"` AND is inconsistently supported by Astro's Vite-based config loader at the time of this change. `readFileSync` works under every TS module mode and avoids a brittle dependency on TS/Vite/Astro version alignment. Bazel-readiness is unaffected — the JSON file is still pure data, still loadable from Starlark.

**Why `DeepReadonly<BuildPaths>` instead of `data as const satisfies BuildPaths`:** `as const` is a syntactic assertion that requires a literal expression — it cannot be applied to a value derived from `JSON.parse` (or from a JSON-modules import). The `DeepReadonly` utility wraps the parsed shape with full readonly typing while preserving the structural type check via `satisfies`. Downstream consumers see the readonly guarantee; the data itself is plain JS.

`build.config.json` is the canonical data file:

```json
{
  "root": ".build",
  "cache": {
    "astro": ".build/cache/astro",
    "content": ".build/cache/content",
    "lhci": ".build/cache/lhci",
    "lychee": ".build/cache/lychee",
    "playwright": ".build/cache/playwright",
    "playwrightMcp": ".build/cache/playwright-mcp"
  },
  "reports": {
    "playwright": {
      "results": ".build/reports/playwright/results",
      "html": ".build/reports/playwright/html"
    },
    "lhci": ".build/reports/lhci",
    "coverage": ".build/reports/coverage"
  },
  "dist": ".build/dist"
}
```

**Tree-sitter grammars are explicitly excluded from `BUILD.cache`.** Tree-sitter grammar artifacts (`.tree-sitter/` cache, compiled grammar `.so`/`.dylib`/`.wasm` files, parser binaries) MUST NOT be installed at the repo level. They belong to the contributor's editor/IDE/global toolchain, not to the project's reproducible build surface. Rationale: (a) grammars are arch-specific binaries and would invalidate cross-OS CI cache keys; (b) grammar versions evolve independently of `build.config.json`; (c) the project does not invoke tree-sitter as a build step. The `.gitignore` collapse drops `.tree-sitter/` from the project-level entry list — contributors who use tree-sitter locally configure it via their global home directory or editor cache (`~/.cache/tree-sitter/`, IDE-managed). No `BUILD.cache.treeSitter` entry exists.

The TS file is a typed wrapper over the JSON; the JSON is the single source of truth (Bazel-readable, npm-readable, pure data).

Tradeoff: two files instead of one for the SSoT. Justified by future Bazel readiness — Starlark can `json.decode(read("build.config.json"))` natively, but cannot import `.ts`. Type safety in TS still works via `as const satisfies BuildPaths` over the imported JSON.

### 3. JSON neutral form drives Bazel-readiness

When (if) Bazel ever adopts:

```python
# build_paths.bzl
load("@bazel_skylib//lib:json.bzl", "json")

_data = json.decode(read_file("//:build.config.json"))
BUILD = struct(**_data)
```

Same source, different language adapter. No data duplication. No commit needed today — just don't author the source as a TS-only construct.

### 4. `astro.config.mjs` becomes `astro.config.ts`

Astro 5 supports `.ts` config files. Renaming gives us native `import { BUILD } from './build.config.ts'` without a compile step. The rename is a one-time migration; no runtime behavior change.

### 5. Generated configs are committed AND drift-gated

Generated files (`lighthouserc.json`, `lychee.toml`, deploy workflow `path:` value) are committed so:

- Fresh clones have working configs without running `npm run sync:build-config` first.
- CI doesn't need a generation step before validation runs.
- Reviewers see path changes in PR diffs.

Drift gate: `npm run sync:build-config && git diff --exit-code` → fails CI if generated files diverge from `build.config.json`. Same pattern used by `adopt-design-md-format` for the spec cache and by `add-brand-assets-and-writing-pipeline` for PNG/favicon outputs.

### 6. `prebuild` lifecycle hook keeps local in sync

```json
{
  "scripts": {
    "prebuild": "node scripts/sync-build-config.mjs",
    "build": "astro build",
    "sync:build-config": "node scripts/sync-build-config.mjs",
    "clean": "rm -rf .build",
    "clean:cache": "rm -rf .build/cache",
    "clean:reports": "rm -rf .build/reports"
  }
}
```

Local `npm run build` always runs sync first, so devs editing `build.config.json` see generated configs update immediately. Sync is idempotent + content-hash-aware (skips writes when target unchanged) → ~50 ms cost.

The third change (`add-brand-assets-and-writing-pipeline`) already adds `prebuild` for favicon+logo generation. This change extends that hook chain:

```json
"prebuild": "node scripts/sync-build-config.mjs && npm run build:favicons && npm run build:logos"
```

### 7. CI artifact upload glob

```yaml
- uses: actions/upload-artifact@<sha>
  if: always()
  with:
    name: reports-${{ github.sha }}
    path: .build/reports/
```

Single path, single artifact. Reports archived per-PR for inspection without manual SCP.

### 8. Public deliverables stay in `public/`

`public/assets/logos/*.png`, `public/favicon.svg`, etc. live under `public/` because Astro's static-asset pipeline copies `public/` into `dist/` (now `.build/dist/`) verbatim. Moving them under `.build/` would require explicit copy-rules and complicates the deploy artifact's content. They are committed deliverables, not runtime artifacts; their lifetime matches the repo, not the build.

### 9. `openspec/.cache/design-md-spec.md` stays put

Per `adopt-design-md-format` Decision #4, this file is committed agent-context (Claude/Codex/Gemini fresh-worktree readability). It is NOT a runtime artifact in the gitignored sense; moving it under `.build/` would invert that contract. The path stays `openspec/.cache/design-md-spec.md` and that file is committed to git.

### 10. Coordination with three in-flight changes

This change MUST land BEFORE `/opsx:apply` runs on any of:

- `adopt-design-md-format` (touches `openspec/.cache/`, `package.json`, workflows)
- `update-site-marketing-redesign` (touches `astro.config.mjs`, multiple `scripts/lint-*.mjs`, lighthouserc.json)
- `add-brand-assets-and-writing-pipeline` (touches `package.json` `prebuild`, `scripts/sync-build-config.mjs` overlap, content cache path)

Phase 1 of this change inventories every reference to old paths in those changes' specs/tasks; Phase 6 cross-links so each apply phase consumes `BUILD.*` constants instead of hardcoded strings.

### 11. Lighthouse CI config has two contributing specs

`lighthouserc.json` is a generated file with TWO sources of truth:

- **Paths** (output, cache, server URL prefixes) — governed by this change's `Lighthouse CI Ready Signal` Requirement (under `check-site-quality`). Sync emits paths from `BUILD.reports.lhci` and `BUILD.cache.lhci`.
- **Assertion shape** (`assertMatrix`, per-URL category gates, `matchingUrlPattern` rules) — governed by the redesign's `Lighthouse CI Performance Gate` Requirement (under `style-system`). Sync emits assertions from a static fixture maintained alongside that Requirement.

The sync script merges both at generation time. Spec text in either capability MUST cross-reference the other so future contributors editing one know the other exists. Neither Requirement is "the" canonical Lighthouse spec — they compose. Archive merge is straightforward because they describe disjoint slices of the same generated file (paths vs assertions) and live in different capabilities.

### 12. Workflow YAML regen is targeted-mutation, not whole-file rewrite

`.github/workflows/deploy.yml` already contains 22 lines of human-authored steps. Full-file regeneration from a template would clobber human edits whenever the template drifts. Instead the sync generator uses `yaml@2.5.x` Document API to mutate ONLY the specific keys derived from BUILD (e.g., `path:` value under `actions/upload-pages-artifact` step):

1. Parse the existing workflow YAML preserving comments and node order.
2. Locate the target node by path expression (e.g., `jobs.deploy.steps[name="Upload artifact"].with.path`).
3. Replace ONLY that scalar value.
4. Stringify with deterministic options.
5. Refuse to write if any non-targeted node changes during the parse-stringify roundtrip (defense against library version drift).

This avoids both whole-file clobber and AST-level surgery brittleness. It also enables CI to verify "human didn't edit a generated key" without forbidding human edits elsewhere in the file.

### 13. Mid-run race on `clean:reports` resolved via lock file

Playwright and Lighthouse runners write reports incrementally during a test run. A bare `rm -rf .build/reports/` issued from another shell mid-run crashes the runner with `EACCES`/`ENOENT`. Resolution: a `.build/reports/.run.lock` sentinel file:

- Test runner integrations (Playwright `globalSetup`, LHCI wrapper) acquire the lock on start, release on exit.
- `npm run clean:reports` invokes `scripts/clean-reports.mjs` which checks for the lock and refuses with non-zero exit if present.
- Stale-lock TTL (e.g., 2 hours since mtime) lets recovered-from-crash runs not lock the directory permanently.
- The plain `rm -rf .build/reports/` shortcut is forbidden — `clean:reports` always goes through the lock-aware script.

### 14. Tree-sitter grammars excluded from build cache

Contributor-machine concern only. Grammars are arch-specific binaries; cross-OS CI cache invalidation, version drift, and the project's lack of a tree-sitter build step all argue for keeping them out of `BUILD.cache.*`. Contributors install grammars via their editor/IDE/global home directory. The `.gitignore` collapse intentionally drops `.tree-sitter/` from the project-level entry list.

## Risks & Rollback

- **Risk: Pages deploy breaks** if `path:` change is wrong → preview-deploy verifies; revert one-line YAML.
- **Risk: TS config rename loses git blame** on `astro.config.mjs` → use `git mv` to preserve.
- **Risk: prebuild sync overhead** → idempotent, hash-skipped, ~50 ms; opt-out via `SKIP_BUILD_SYNC=1`.
- **Risk: Drift gate false positives** → sync script writes ONLY human-edited config, not runtime caches; tools' runtime state lives under `.build/cache/<tool>/` and never collides with the generated config files.
- **Risk: Old paths still referenced** → Phase 1 grep + automated fix; CI gate `git grep "(^|[^.])dist/" -- ":!build.config.*"` returns 0 hits outside the SSoT.
- **Risk: Cross-change drift with three in-flight** → this change lands first; their `/opsx:apply` consumes BUILD constants.
- **Rollback**: per-step independent in reverse phase order; deploy-touching steps revert via single workflow YAML edit.

## Open Questions

- (None remain unresolved at validate time. All four prior candidates were decided in Decisions #2, #3, #4, #5.)
