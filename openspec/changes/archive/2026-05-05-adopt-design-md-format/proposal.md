## Why

Google Labs (the team behind Stitch, the Gemini-powered AI UI tool) has open-sourced the **DESIGN.md format spec** at <https://github.com/google-labs-code/design.md> (Apache-2.0, ~10.7k stars as of 2026-04-22). The format combines machine-readable design tokens (YAML frontmatter inspired by the W3C Design Token spec) with human-readable rationale (markdown body), giving coding agents a persistent, structured understanding of a design system from a single repo-resident file. A `@google/design.md` CLI ships `lint`, `diff`, `export` (Tailwind / DTCG), and `spec` commands; a programmatic linter API is exposed at `@google/design.md/linter`.

We already have a 761-line `new-design/extracted/DESIGN.md` modeled on this format (it was the design handoff produced for the in-flight `update-site-marketing-redesign` change). Adopting the format spec officially:

1. Makes the design contract executable — `npx @google/design.md lint DESIGN.md` becomes a first-class CI gate alongside our existing `lint:sg` ast-grep pipeline.
2. Aligns our DESIGN.md with a documented external schema, so future contributors (and AI agents in this repo) read against a stable, public spec instead of an ad-hoc internal convention.
3. Unlocks `export → DTCG tokens.json` and `export → Tailwind` paths if either becomes useful (we don't ship Tailwind, but DTCG is a portable handoff format for downstream consumers).
4. Decouples the DESIGN.md authoring contract from the marketing-redesign change, so DESIGN.md edits stop being implicit-spec-changes and become first-class changes against a documented format.

This is **infrastructure adoption only** — no visual redesign, no token-value changes. The existing DESIGN.md content under `new-design/extracted/` becomes the seed; we promote it to `DESIGN.md` at repo root, validate it against the spec, fix structural findings, and wire the lint/diff CLI into the build pipeline.

## What Changes

- **Promote `new-design/extracted/DESIGN.md` to `DESIGN.md` at repo root** as the canonical visual contract for `artagon.com`. Document the precedence: `openspec/specs/*` govern behavior; `DESIGN.md` governs visual presentation; implementation traces to both. On conflict, the spec wins and `DESIGN.md` is updated in the same change.
- **Create a new `design-system-format` capability** owning the contract: file location, format compliance, lint gate, change workflow, drift detection.
- **Adopt the upstream spec at version `alpha`** — pin the exact upstream commit SHA in `openspec/config.yaml` context so format drift is a deliberate, reviewable upgrade. Include a `version: alpha` line in our DESIGN.md frontmatter.
- **Add `@google/design.md` as a devDependency** (latest tagged release; pin to a specific minor since the format is alpha and may break). Add npm scripts: `lint:design`, `diff:design`. Wire `lint:design` into `npm run postbuild` and the existing `npm run lint:sg:ci` orchestration. **BREAKING for contributors:** any DESIGN.md edit that fails `lint:design` blocks the build.
- **Reconcile our existing DESIGN.md content with the spec.** Our 761-line file (under `new-design/extracted/`) uses OKLCH colors, multi-theme tokens (twilight + midnight), motion tokens, and section names like "Voice & tone" and "Foundations" that don't map 1:1 to the upstream section taxonomy. Reconciliation tasks: (a) add YAML frontmatter with the canonical token block (colors, typography, rounded, spacing, components); (b) rename or alias sections to fit `Overview · Colors · Typography · Layout · Elevation & Depth · Shapes · Components · Do's and Don'ts`; (c) preserve our extra prose under permitted unknown-section headings (the spec accepts unknown headings without erroring). OKLCH → sRGB hex conversion is required at the YAML layer; the prose may continue to cite OKLCH for brand precision.
- **Coordinate with the in-flight `update-site-marketing-redesign` change via a depends-on note**, NOT in-place edits of that change's files. **This change MUST land before `update-site-marketing-redesign`.** The redesign currently references `new-design/extracted/DESIGN.md`; after this change merges, the redesign's own apply phase will update its path references in its next commit. A CI gate (`npm run verify:design-prerequisites`) fails if the redesign's tasks still reference the old path while this change is archived.
- **Add a Claude/Codex/Gemini context hook**: spec snippet (`npx @google/design.md spec --format markdown`) gets generated to `openspec/.cache/design-md-spec.md` and referenced from `openspec/config.yaml` `context:` so coding agents always read the format rules alongside our project context.
- **Author a contributor doc** at `docs/design-md.md` covering: how to edit DESIGN.md, how the lint runs, when to bump `version:` if upstream goes from `alpha` to `beta`, and the precedence chain with `openspec/specs/*`.
- **Add an ast-grep rule (where applicable) and a Playwright check** asserting that any token referenced from `public/assets/theme.css` or `src/styles/*` resolves against DESIGN.md (post-export to DTCG, where tractable). This is best-effort drift detection — primary enforcement remains `lint:design`.

## Scope Boundaries

**In Scope:**

- Promote `new-design/extracted/DESIGN.md` to `DESIGN.md` (root).
- New `design-system-format` capability with lint gate, change workflow, drift requirement.
- `@google/design.md` devDependency + `lint:design` + `diff:design` scripts.
- Section/frontmatter reconciliation against upstream spec.
- Context-cache file generated from `npx @google/design.md spec`.
- Contributor documentation under `docs/design-md.md`.

**Out of Scope:**

- **No visual redesign.** Token VALUES (colors, typography sizes, motion durations) are unchanged from the existing DESIGN.md. Re-tokenizing for OKLCH↔hex parity is a mechanical conversion only; if a hex round-trip would shift a perceptual color, the OKLCH stays in prose and the YAML uses the closest hex.
- **No Tailwind adoption.** `export --format tailwind` is documented but not wired; we don't ship Tailwind. `export --format dtcg` is wired in `package.json` but its output is not consumed yet (build artifact only).
- **No upstream PR.** Any improvements we want to suggest to google-labs-code/design.md ship as a separate change in their repo.
- **`update-site-marketing-redesign` file edits** — this change does NOT directly mutate any file under `openspec/changes/update-site-marketing-redesign/`. Path reconciliation is the redesign's responsibility once this change archives.
- **No bundling of `@google/design.md` into client output.** It's a CI-only devDependency.
- **No re-architecting `style-system`.** This change adds one ADDED requirement to `style-system` ("Token Traceability to DESIGN.md") and otherwise leaves it untouched.

## Risks and Rollback

- **Risk: Upstream `alpha` schema breaks between minor releases.** The format is explicitly under active development. **Mitigation:** Pin `@google/design.md` to an exact version (no caret), pin the upstream commit SHA in `openspec/config.yaml`, install with `npm install --save-dev --ignore-scripts` (defense against postinstall on a future malicious republish), use `npm ci --ignore-scripts` in CI, and run a weekly `.github/workflows/design-md-drift.yml` cron that (a) regenerates the spec cache and `git diff --exit-code`s it, and (b) hits `gh api repos/google-labs-code/design.md` and fails if `archived=true` OR last push >90 days. Behavior regressions are caught by fixture-based snapshot tests under `tests/fixtures/design-md/{good,bad}.md` exercising the linter's exit code and finding count.
- **Risk: Our existing DESIGN.md prose violates `section-order` lint at `warning` severity.** Section names like "Voice & tone", "Foundations", "Patterns" don't appear in the upstream `Overview/Colors/Typography/Layout/Elevation/Shapes/Components/Do's and Don'ts` taxonomy. **Mitigation:** The spec accepts unknown sections without erroring; we either (a) move our extra prose under one of the canonical section headings, or (b) accept the `section-order` warning and document the deviation in the `design-system-format` capability with a per-line allowlist when the linter supports it. Default: option (a) — reorganize prose into canonical sections.
- **Risk: Lint contradicts existing OKLCH commitment.** Our DESIGN.md says "Site uses the OKLCH color space throughout" but the upstream Color schema is `# + sRGB hex`. **Mitigation:** YAML frontmatter holds sRGB hex equivalents (round-tripped from OKLCH at authoring time); prose continues to cite OKLCH for brand precision. The hybrid is enforced by `scripts/check-oklch-hex-parity.mjs` (invoked from `lint:design`) which re-derives hex from prose-cited OKLCH and fails on mismatch beyond a documented epsilon (1 LSB per channel). `scripts/oklch-to-hex.mjs` (`npm run derive:hex`) auto-generates the conversion table committed to `docs/design-md.md`.
- **Risk: Adds CI surface that flakes if `@google/design.md` upstream changes its CLI flags.** **Mitigation:** Pin exact dep version; integration test at the `lint:design` level (run a known-good DESIGN.md fixture through the pinned CLI in CI). Upgrade is a deliberate change, never automated.
- **Risk: `update-site-marketing-redesign` references `new-design/extracted/DESIGN.md` paths.** **Mitigation:** This change lands first and does NOT mutate redesign files. After archive, the redesign's apply phase (under its own ownership) updates the references. `npm run verify:design-prerequisites` fails the build if the redesign's tasks still reference the old path while this change is archived.
- **Risk: License attribution.** The format spec is Apache-2.0; we are not redistributing google-labs-code source, only adopting the format. **Mitigation:** `docs/design-md.md` cites the upstream repo, license, and version pin. No NOTICE file change needed because we don't bundle Apache-2.0 code.
- **Rollback ordering (matters):** Revert Phase 6 (drift script) before Phase 2 (devDep). Revert Phase 4 (path notes / cross-links) before Phase 3 (DESIGN.md promotion). Concretely: (1) remove `check:design-drift` and `check:oklch-hex-parity` from CI; (2) remove `lint:design` from `postbuild`; (3) `npm uninstall @google/design.md`; (4) remove cross-link notes from `openspec/project.md`; (5) move `DESIGN.md` back to `new-design/extracted/DESIGN.md`; (6) revert spec deltas. Per-step rollback inside this ordering is independent.

## Impact

- **Affected Specs:**
  - `design-system-format` — **New Capability** (file location, frontmatter contract, section order, lint gate, version pinning, drift detection).
  - `style-system` — **ADDED** (one new requirement: "Token Traceability to DESIGN.md" — every `--color-*`, typography, spacing, and rounded token in `public/assets/theme.css` MUST trace to a DESIGN.md token via `check:design-drift` at error severity, with an explicit allow-list seeded from current orphans).

- **Affected Code:**
  - `DESIGN.md` (new, promoted from `new-design/extracted/DESIGN.md`).
  - `package.json` (`@google/design.md` devDep installed with `--ignore-scripts`; `lint:design`, `diff:design`, `export:dtcg`, `spec:cache`, `derive:hex`, `verify:design-prerequisites`, `check:design-drift`, `check:oklch-hex-parity` scripts; `postbuild` hook addition; `package-lock.json` integrity hash matches npm registry's signed `dist.integrity`).
  - `openspec/config.yaml` (context block updated with DESIGN.md precedence + upstream version pin).
  - `openspec/.cache/design-md-spec.md` (generated artifact; gitignored OR committed — see `design.md` Decision #4).
  - `docs/design-md.md` (new contributor doc).
  - `.github/workflows/*.yml` (CI runs `lint:design`).
  - `new-design/extracted/DESIGN.md` (deleted after promotion; redirect note left in `new-design/MIGRATION.md`).
  - `openspec/project.md` — cross-link note added: "`adopt-design-md-format` is a prerequisite for `update-site-marketing-redesign`; the redesign updates its own path references after this change archives." This change does NOT directly edit `openspec/changes/update-site-marketing-redesign/*`.
  - `rules/security/` — possible new ast-grep rule (drift detection complement).
  - `tests/fixtures/design-md/{good,bad}.md` — fixture pair exercising linter exit-code + finding-count snapshots.
  - `.github/workflows/design-md-drift.yml` — weekly cron: spec cache regen + upstream-archival/staleness probe.

- **Affected Docs:**
  - `README.md` — section linking to `DESIGN.md` and `docs/design-md.md`.
  - `AGENTS.md` — "Design contract" subsection added between MCP and AST-GREP sections.
  - `openspec/project.md` — DESIGN.md added to the precedence chain.
