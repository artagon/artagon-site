## Context

`artagon-site` is an Astro 5 static site with a strict "zero runtime JS by default" contract, SRI + CSP postbuild, ast-grep linting, Lighthouse CI, and an OpenSpec-driven workflow. The in-flight `update-site-marketing-redesign` change adopts a 761-line `DESIGN.md` (currently at `new-design/extracted/DESIGN.md`) as the visual contract for the redesign — but that file is structurally an internal artifact, with bespoke section names ("Voice & tone", "Patterns", "Foundations") and OKLCH tokens that do not match any external schema.

Google Labs (the team behind Stitch — the Gemini-powered AI UI generator) has open-sourced **`google-labs-code/design.md`** (Apache-2.0, ~10.7k stars, format version `alpha`, last touched 2026-04-22). It is a format spec for a single repo-resident DESIGN.md file that combines:

- **YAML frontmatter** — machine-readable design tokens inspired by the W3C Design Token spec (typed groups for `colors`, `typography`, `spacing`, `rounded`, `components`; sRGB hex colors; `{path.to.token}` references).
- **Markdown body** — human-readable rationale organized into a canonical section order: `Overview · Colors · Typography · Layout · Elevation & Depth · Shapes · Components · Do's and Don'ts`.

A `@google/design.md` CLI ships `lint`, `diff`, `export` (Tailwind / DTCG), and `spec` commands, plus a programmatic linter API exposed at `@google/design.md/linter`. The linter runs seven rules: `broken-ref` (error), `missing-primary` / `contrast-ratio` / `orphaned-tokens` / `missing-typography` / `section-order` (warning), `token-summary` / `missing-sections` (info).

This change adopts the upstream format as our DESIGN.md authoring contract, promotes the existing file to repo root, and wires the lint CLI into CI. **Pure infrastructure adoption — no token-value changes, no visual redesign.**

## Goals / Non-Goals

### Goals

- Promote `DESIGN.md` to a first-class, lint-gated, externally-documented contract in this repo.
- Pin the upstream format spec to a specific commit SHA so format drift is reviewable.
- Reconcile our existing DESIGN.md's structure (frontmatter + section order) against the upstream schema with the smallest possible content delta.
- Generate a DESIGN.md spec context cache that any agent (Claude, Codex, Gemini) reads alongside `openspec/config.yaml`.
- Add a CI gate (`lint:design`) that fails the build on `error`-severity findings and surfaces `warning`s in the run log.
- Document the precedence: `openspec/specs/*` govern behavior; `DESIGN.md` governs visual presentation; implementation traces to both. On conflict, the spec wins and `DESIGN.md` is updated in the same change.

### Non-Goals

- No visual redesign. Token VALUES (colors, typography sizes) are unchanged.
- No Tailwind adoption. The `export --format tailwind` path is documented but not wired.
- No bundling of `@google/design.md` into client output — it's a CI-only devDep.
- No re-architecting `style-system`. We add one ADDED requirement (Token Traceability to DESIGN.md) and otherwise leave it alone.
- No upstream-PR coordination — improvements to google-labs-code/design.md are out of scope.

## Decisions

### 1. Pin upstream by exact npm version AND commit SHA

The format is at version `alpha` and explicitly under active development. We pin two layers of attestation:

- `package.json` `devDependencies["@google/design.md"]` to an **exact** version (no `^`, no `~`).
- Install with `npm install --save-dev --ignore-scripts` (defense against postinstall on a future malicious republish, given the publisher/author decoupling on the upstream npm package). CI uses `npm ci --ignore-scripts`.
- `package-lock.json` integrity hash MUST match the npm registry's published signed `dist.integrity`; a Phase 2 task asserts this.
- `openspec/config.yaml` records the upstream commit SHA captured at adoption time.
- A weekly `.github/workflows/design-md-drift.yml` cron runs three checks: (a) regenerate spec cache via `npm run spec:cache` and `git diff --exit-code` it, (b) hit `gh api repos/google-labs-code/design.md` and fail if `archived=true` OR last push >90 days, (c) execute fixture-based snapshot tests under `tests/fixtures/design-md/{good,bad}.md` exercising the linter's exit code and finding count to catch behavior regressions that don't change the spec text.

Tradeoff: We pay the maintenance cost of explicit upgrade reviews. We avoid silent format breaks, malicious republishes, repo abandonment, and behavior drift during dependency updates.

### 2. OKLCH stays in prose; YAML carries sRGB hex equivalents

Our DESIGN.md commits to "Site uses the OKLCH color space throughout" because OKLCH gives perceptually-uniform color steps in our token ladder. The upstream `Color` schema is `# + sRGB hex` only (no OKLCH support yet). We resolve the conflict by:

- YAML frontmatter lists each color as `# + sRGB hex`, derived from the canonical OKLCH at authoring time.
- Markdown body continues to cite OKLCH values for the canonical token specification (e.g., `--bg = oklch(0.14 0.008 260)`).
- The conversion table is committed to `docs/design-md.md` and **auto-generated** by `scripts/oklch-to-hex.mjs` (`npm run derive:hex`) so it cannot drift manually.
- Hybrid integrity is enforced by `scripts/check-oklch-hex-parity.mjs` (invoked from `lint:design`): the script re-derives hex from prose-cited OKLCH and fails on mismatch beyond a documented epsilon (1 LSB per channel). This is a Requirement, not a doc convention — see `specs/design-system-format/spec.md` "OKLCH-Hex Parity".

Tradeoff: We tolerate a single source of OKLCH-to-hex round-trip drift (≤ 1 LSB per channel, undetectable visually). We avoid blocking on upstream OKLCH support, which is not on the spec roadmap.

### 3. Reorganize body sections into canonical order

Our existing DESIGN.md uses a custom section taxonomy (Voice & tone, Foundations, Components, Patterns, Patterns, etc.). The upstream canonical order is `Overview · Colors · Typography · Layout · Elevation & Depth · Shapes · Components · Do's and Don'ts`. The linter accepts unknown headings without erroring, but warns at `section-order` when canonical sections are out of sequence.

Decision: **Reorganize prose into canonical sections.** The upstream taxonomy actually fits our content well — Voice & tone moves under `Overview`, Foundations splits across `Colors`, `Typography`, `Layout`, `Shapes`. Patterns merges into `Components` or stays as an unknown section after the canonical ones. Sections we genuinely have no upstream-mapped content for (e.g., Elevation & Depth on a flat-aesthetic site) are intentionally absent — the linter emits an `info`-severity `missing-sections` finding which we accept.

### 4. Spec cache (`openspec/.cache/design-md-spec.md`) is committed, not gitignored

`npx @google/design.md spec --format markdown` emits the format spec for agent context. We could regenerate it on every CI run, but agents that read `openspec/config.yaml` `context:` references resolve `@/openspec/.cache/design-md-spec.md` against working-tree content. If the file is gitignored, agents in fresh worktrees see no spec.

Decision: **Commit the cache.** A CI step runs `npm run spec:cache` and `git diff --exit-code openspec/.cache/` — divergence fails the build, forcing a deliberate refresh PR. This makes spec upgrades a reviewed event.

Tradeoff: We add a generated-but-tracked file to git history, which some teams avoid. We get reproducible, audit-trail-rich spec context that agents can rely on.

### 5. `lint:design` runs in `postbuild`, not `prebuild`

`postbuild` already runs SRI + CSP scripts after Astro emits to `dist/`. `lint:design` reads `DESIGN.md` only and is `dist/`-independent — it could run anywhere. Putting it in `postbuild` keeps a single CI orchestration entry point and means devs running `npm run build` locally get the same gate as CI.

Tradeoff: A failing `lint:design` blocks build success even when DESIGN.md is the only change. Acceptable — DESIGN.md is the design contract and unfit DESIGN.md should not produce a deploy.

### 6. Drift detection ships at error severity with an explicit allow-list

`scripts/check-design-drift.mjs` (Phase 6) asserts every `--color-*`, typography, spacing, and rounded token in `theme.css` resolves to a DESIGN.md token. This works cleanly for primitives but fragments at higher-order tokens (gradient compositions, theme-aware fallbacks). The `lint-tokens.mjs` script from `update-site-marketing-redesign` Phase 2.7-2.8 enforces "no raw color literals in component CSS." Drift detection adds a second layer: "every token name in CSS exists in DESIGN.md."

Decision: Ship drift detection at **`error` severity from day one** with an explicit allow-list seeded from current orphans. Adding to the allow-list requires a comment citing the rationale; CI fails on unallow-listed orphans. The requirement lives ONCE in `style-system` (Token Traceability to DESIGN.md), NOT duplicated in `design-system-format` — drift is a CSS-token concern owned by `style-system`. `design-system-format` is the format contract; `style-system` is the token contract.

Tradeoff: First-week noise from any uncatalogued tokens is the cost of avoiding a "warn-only that gates nothing" trap. The allow-list provides the escape hatch.

### 7. License attribution

The format spec is Apache-2.0. We are not redistributing google-labs-code source — we adopt the format and consume the npm package. Attribution lives in:

- `docs/design-md.md` cites the upstream repo, license (`Apache-2.0`), and pinned commit SHA.
- `package.json` `devDependencies` carry the package name, which transitively records license metadata in `package-lock.json` and downstream `npm ls`.

No `NOTICE` or `LICENSE` file change is required because we don't bundle Apache-2.0 source. (If we ever vendor `@google/design.md` source code into our tree, that calculus changes.)

### 8. Coordination with `update-site-marketing-redesign` — hard ordering

Both changes are in flight. Path references in the redesign currently point at `new-design/extracted/DESIGN.md`.

Decision: **This change MUST land before `update-site-marketing-redesign`.** This change does NOT directly mutate any file under `openspec/changes/update-site-marketing-redesign/` — that would violate the openspec authoring rule that a change owns its files. After this change archives, the redesign's apply phase updates its path references in its next commit, under the redesign's own ownership.

Enforcement: `npm run verify:design-prerequisites` (Phase 0.5) fails the build if (a) `update-site-marketing-redesign` is in flight AND its tasks reference `new-design/extracted/DESIGN.md` paths AND this change is archived (the redesign owes a path-update commit), OR (b) this change is in flight and someone tries to land it before its prerequisite check passes.

## Risks & Rollback

- **Risk: Upstream `alpha` schema breaks between minor releases.** Mitigation: Exact version pin + weekly drift check + spec cache committed. Upgrade is a deliberate, reviewable change.
- **Risk: Lint contradicts existing OKLCH commitment.** Mitigation: hybrid YAML-hex + prose-OKLCH per Decision #2.
- **Risk: `section-order` warning becomes noisy if our prose stays out of canonical order.** Mitigation: Reorganize per Decision #3; one-time content move, no further warnings.
- **Risk: Adds CI surface that flakes on upstream CLI changes.** Mitigation: integration test using a known-good DESIGN.md fixture run through the pinned CLI in CI.
- **Risk: `update-site-marketing-redesign` path references churn.** Mitigation: Phase 4 reconciliation; both changes path-stable after either order of merge.
- **Risk: Sub-1-LSB hex drift on OKLCH round-trip.** Mitigation: visually undetectable; conversion table committed for re-derivation; if a contributor needs exact OKLCH math, prose has it.
- **Rollback ordering (matters):** Revert Phase 6 (drift script) before Phase 2 (devDep). Revert Phase 4 (path notes / cross-links) before Phase 3 (DESIGN.md promotion). Concretely: (1) remove `check:design-drift` and `check:oklch-hex-parity` from CI; (2) remove `lint:design` from `postbuild`; (3) `npm uninstall @google/design.md`; (4) remove cross-link notes from `openspec/project.md`; (5) move `DESIGN.md` back to `new-design/extracted/DESIGN.md`; (6) revert spec deltas. Per-step rollback inside this ordering is independent.

### 9. Stay on npm; no bun adoption

Upstream uses bun for its monorepo tooling. We stay on npm; the CLI works fine via `npx`. Adding a second package manager to this repo for one devDep is not justified.

### 10. DTCG export is ephemeral; not committed

`export --format dtcg` runs as a smoke test in Phase 3.6; output is not committed. If a downstream consumer ever needs the file, ship a follow-up `publish-dtcg-tokens` change.

### 11. Contrast-ratio gate stays at warning for one stable cycle

Initially `warning`-only (upstream default). After one stable cycle when we've verified all component pairs pass WCAG AA, promote to `error` in a follow-up `tighten-contrast-gate` change. Matches our existing accessibility-audit cadence.

### 12. Upstream alpha→beta is never auto-bumped; cron detects graduation

Bumping is a deliberate change (`bump-design-md-to-<version>`) with full review; we don't trust automated upgrades on an alpha spec. The Decision #1 weekly cron job ALSO compares the upstream `version-tag` against our pin — when upstream tags a new version, the job opens a tracking issue with the diff. No auto-PR; the bump is human-reviewed.

### 13. Upstream-archival exit strategy

If `@google/design.md` is unpublished from npm or its repo archives for >90 days (detected by Decision #1's weekly cron), we vendor `@google/design.md@<pinned-version>` source into `vendor/design.md/` under Apache-2.0 with a `NOTICE` file citing the upstream repo. This triggers the Decision #14 license calculus.

### 14. License attribution

The format spec is Apache-2.0. We are not redistributing google-labs-code source — we adopt the format and consume the npm package. Attribution lives in `docs/design-md.md` (cites upstream repo, license, pinned commit SHA, pinned LICENSE-file SHA, and links the upstream LICENSE file directly). `package.json` `devDependencies` carries the package name; `package-lock.json` records integrity. Note: as of pinning, the published npm `package.json` omits its `license` field — Phase 0 files an upstream issue and pins the upstream LICENSE-file SHA in `docs/design-md.md` so license-checker tools have a verified reference.

If we ever vendor source per Decision #13, we add a top-level `NOTICE` file with the Apache-2.0 attribution boilerplate.

## Open Questions

- (None remain unresolved at validate time.)
