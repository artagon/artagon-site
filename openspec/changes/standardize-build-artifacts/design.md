## Context

Build artifacts scattered across repo root: `dist/`, `.astro/`, `.lighthouseci/`, `test-results/`, `playwright-report/`, `playwright/.cache/`, `.cache/content-repo/`, `.tree-sitter/`, `.playwright-mcp/`. Six `.gitignore` entries. Each tool's path hardcoded in its own config. Adding a tool means N more entries + N more configs to keep aligned.

This change consolidates everything under `.build/` and centralizes path declarations in `build.config.ts`. JSON-only configs (Lighthouse CI, Lychee) are generated from a JSON neutral form (`build.config.json`) so a future Bazel migration can load the same source via Starlark.

## Goals / Non-Goals

### Goals

- Single source of truth for all build/cache/report paths.
- Type-safe path lookups in TS configs (no string drift).
- One `.gitignore` line.
- One `npm run clean` that nukes everything reproducible.
- CI cache key = single hash of `.build/cache/` directory.
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
import data from "./build.config.json" with { type: "json" };

interface BuildPaths {
  root: string;
  cache: {
    astro: string;
    content: string;
    lhci: string;
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

export const BUILD = data as const satisfies BuildPaths;
```

`build.config.json` is the canonical data file:

```json
{
  "root": ".build",
  "cache": {
    "astro": ".build/cache/astro",
    "content": ".build/cache/content",
    "lhci": ".build/cache/lhci",
    "playwright": ".build/cache/playwright",
    "treeSitter": ".build/cache/tree-sitter",
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
