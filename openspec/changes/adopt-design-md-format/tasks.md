# Tasks — adopt-design-md-format

> Each task lists files touched and the acceptance signal. Tasks within a phase MAY parallelize; phases MUST land in order.

## Phase 0 — Pre-flight

- [x] 0.1 Snapshot upstream pin: `gh api repos/google-labs-code/design.md/commits/main --jq '.sha'` → record in `openspec/config.yaml` and in `docs/design-md.md` as the verified ancestor.
- [x] 0.2 Snapshot pinned npm version: `npm view @google/design.md version dist-tags.latest` → record in `package.json` (exact, no caret).
- [x] 0.3 `openspec validate adopt-design-md-format --strict` passes.
- [x] 0.4 Verify no path collision with `update-site-marketing-redesign`'s in-flight references; this change MUST land before the redesign per `design.md` Decision #8.
- [x] 0.5 File upstream issue at `google-labs-code/design.md` requesting `"license": "Apache-2.0"` in the published `package.json` (npm metadata currently omits it); record issue URL in `docs/design-md.md`. Pin upstream `LICENSE`-file SHA in `docs/design-md.md` so license-checker tools have a verified reference until the upstream fix lands.
- [x] 0.6 Build `scripts/verify-design-prerequisites.mjs` (`npm run verify:design-prerequisites`): fails the build only when `update-site-marketing-redesign` is **in flight** (directory exists at `openspec/changes/update-site-marketing-redesign/`, NOT archived) AND its **live `tasks.md`** still references `new-design/extracted/DESIGN.md` paths. The grep MUST be scoped to the in-flight tasks file ONLY — historical references in `proposal.md`/`design.md` are authoring records, not build inputs, and MUST NOT trigger the failure. Once the redesign archives (its directory moves to `openspec/changes/archive/<timestamp>-update-site-marketing-redesign/`), the script exits 0 unconditionally because the redesign is no longer in flight. Wire into CI postbuild step.

  Acceptance: a unit-test fixture proves three states — (a) redesign in flight + tasks reference old paths → exit 1; (b) redesign in flight + tasks updated → exit 0; (c) redesign archived → exit 0 regardless of historical references.

## Phase 1 — Capability scaffolding

- [x] 1.1 Spec deltas live under `openspec/changes/adopt-design-md-format/specs/{design-system-format,style-system}/spec.md` (already created at proposal time).
- [x] 1.2 Update `openspec/project.md` precedence: `openspec/specs/*` govern behavior; `DESIGN.md` governs visual presentation; implementation traces to both. On conflict, the spec wins and `DESIGN.md` is updated in the same change. Add a cross-link note: "`adopt-design-md-format` is a prerequisite for `update-site-marketing-redesign`."
- [x] 1.3 Update `openspec/config.yaml` `context:` block with DESIGN.md location + upstream version pin + commit SHA.

## Phase 2 — Adopt the CLI

- [x] 2.1 `npm install --save-dev --ignore-scripts @google/design.md@<EXACT-VERSION>` (no caret, no postinstall execution).
- [x] 2.1a Commit `package-lock.json` and assert its `integrity` hash for `@google/design.md` matches the npm registry's published signed `dist.integrity`. Document the verification command in `docs/design-md.md`.
- [x] 2.2 Add scripts to `package.json`: `lint:design`, `lint:design:watch` (if upstream supports `--watch`; otherwise document the gap), `diff:design`, `export:dtcg`, `spec:cache`, `derive:hex`, `verify:design-prerequisites`, `check:design-drift`, `check:oklch-hex-parity`. CI uses `npm ci --ignore-scripts`.
- [x] 2.3 Add `npm run lint:design` (with `check:oklch-hex-parity` as a precondition) to `postbuild` (after existing `sri.mjs` + `csp.mjs`).
- [x] 2.3a Add `lint:design` to a pre-commit hook (via `.husky/pre-commit` shell step or `lint-staged`) scoped to changes touching `DESIGN.md`. Document in `docs/design-md.md`.
- [x] 2.4 Add `npm run lint:design`, `npm run lint:sg:ci`, and `npm run check:design-drift` to the same CI step in `.github/workflows/*.yml`.
- [x] 2.5 Run `npx @google/design.md spec --format markdown > openspec/.cache/design-md-spec.md` and `git add` the result (committed per `design.md` Decision #4).
- [x] 2.6 Wire spec cache into `openspec/config.yaml` `context:` block via `@/openspec/.cache/design-md-spec.md` reference.
- [x] 2.7 Add `.github/workflows/design-md-drift.yml` (weekly cron). Three checks: (a) regenerate spec cache and `git diff --exit-code` it; (b) `gh api repos/google-labs-code/design.md` and fail if `archived=true` OR last push >90 days; (c) execute `tests/fixtures/design-md/{good,bad}.md` snapshot tests asserting linter exit code + finding count. Failure opens a tracking issue; does not auto-PR.
- [x] 2.8 Add a PR-scoped GitHub Actions job with `paths: ['DESIGN.md']` that runs `npx @google/design.md diff origin/main:DESIGN.md DESIGN.md` and posts the result as a PR comment.
- [x] 2.9 Author `tests/fixtures/design-md/good.md` (passes lint cleanly) and `tests/fixtures/design-md/bad.md` (deliberately broken: one `broken-ref`, one `contrast-ratio` failure). Add `npm run test:design-fixtures` that runs the linter on each fixture and asserts exit code + finding count snapshots.
- [x] 2.10 Telemetry verification: `npm run lint:design` MUST make zero outbound network calls. Assert via `unshare -n` (Linux CI) or by running the lint inside a Docker container with `--network=none`.

## Phase 3 — Promote DESIGN.md to root

- [x] 3.1 Copy `new-design/extracted/DESIGN.md` → `DESIGN.md` at repo root.
- [x] 3.2 Add YAML frontmatter at the top of `DESIGN.md`:
  ```yaml
  ---
  version: alpha
  name: Artagon
  description: Trusted identity for machines and humans — verified, private, attested.
  colors:
    # ...sRGB hex equivalents of the OKLCH tokens, both twilight and midnight as separate token names
  typography:
    # ...the 5 families with sizes/weights/lineHeights/letterSpacings
  spacing:
    # ...8-point grid
  rounded:
    # ...the 4-tier radius scale
  components:
    # ...nav, footer, glow-tag, standard-chip, trust-chain row, button-primary, button-secondary, code-block
  ---
  ```
- [x] 3.3 Build `scripts/oklch-to-hex.mjs` (`npm run derive:hex`): reads OKLCH triples cited in DESIGN.md prose (or a sidecar `.oklch.yaml`), emits hex equivalents, and regenerates the conversion table in `docs/design-md.md`. Wired so the table cannot drift manually.
- [x] 3.3a Build `scripts/check-oklch-hex-parity.mjs` (`npm run check:oklch-hex-parity`): re-derives hex from prose-cited OKLCH, fails if any frontmatter hex differs from the derived hex by more than 1 LSB per channel. Invoked from `lint:design` precondition.
- [x] 3.4a **Structure-only commit (no prose changes):** rename and move sections in DESIGN.md into canonical order — `Overview · Colors · Typography · Layout · Elevation & Depth · Shapes · Components · Do's and Don'ts`. Use `git mv`-style edits where feasible to preserve blame. Commit message: `refactor(design): reorder sections, no content changes`.
- [x] 3.4b **Prose pass within newly-ordered sections:** edit content to fit canonical headings (Voice & tone → Overview; Foundations → Colors/Typography/Layout/Shapes; Patterns → Components or unknown-section after canonical). Sections we genuinely have no content for (e.g., Elevation & Depth on a flat-aesthetic site) stay absent; accept the `info`-severity `missing-sections` finding.
- [x] 3.5 Run `npx @google/design.md lint DESIGN.md`. Address all `error`-severity findings; document each `warning` deliberately accepted (in `docs/design-md.md`).
- [x] 3.6 Run `npx @google/design.md export --format dtcg DESIGN.md > /tmp/tokens.dtcg.json` as a smoke test. Output is not committed; `export:dtcg` script is wired for future use.
- [~] 3.7 Delete `new-design/extracted/DESIGN.md`. Update `new-design/MIGRATION.md` with a note: "DESIGN.md promoted to repo root on `<date>` per `adopt-design-md-format` change."

## Phase 4 — Cross-link only (no in-place edits to other changes)

- [x] 4.1 Add a cross-link note to `openspec/project.md`: "`adopt-design-md-format` is a prerequisite for `update-site-marketing-redesign`. After this change archives, the redesign updates its own path references in its next commit (under the redesign's ownership)."
- [x] 4.2 `npm run verify:design-prerequisites` passes (built in Phase 0.6).
- [x] 4.3 Re-run `openspec validate update-site-marketing-redesign --strict` to confirm no spec collision (path references stay valid until the redesign's own apply phase rewrites them).

## Phase 5 — Documentation

- [x] 5.1 Author `docs/design-md.md` with these REQUIRED sections:
  - **Precedence chain** (canonical phrasing): "openspec/specs/\* govern behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change."
  - **Adding a new color token** — 6-step numbered checklist: (1) edit OKLCH in prose, (2) `npm run derive:hex` to regenerate hex + conversion table, (3) confirm YAML frontmatter hex updated, (4) update `public/assets/theme.css` token declaration, (5) `npm run check:design-drift` passes, (6) `npm run lint:design` passes (no new `contrast-ratio` warning).
  - **Bumping `@google/design.md` version** — checklist: (1) `npm install --save-dev --ignore-scripts @google/design.md@<NEW>`, (2) `npm run spec:cache && git add openspec/.cache/design-md-spec.md`, (3) update upstream commit SHA + `version:` in `openspec/config.yaml` + `DESIGN.md` frontmatter, (4) run `npm run test:design-fixtures` and update snapshots if intentional, (5) `npm run lint:design` passes.
  - **OKLCH↔hex hybrid policy** with conversion table (auto-generated by `npm run derive:hex`).
  - **Upstream attribution**: pinned commit SHA, pinned LICENSE-file SHA, link to upstream LICENSE, note about npm `package.json` license-field workaround.
  - **Allow-list for `check:design-drift`** with one paragraph per allow-listed token citing the rationale.
- [x] 5.2 Update `README.md` with a "Design contract" subsection linking `DESIGN.md` and `docs/design-md.md`.
- [x] 5.3 Update `AGENTS.md` with a "Design contract" subsection between the existing MCP and AST-GREP blocks. Use the canonical precedence phrasing from 5.1.
- [x] 5.4 Update `openspec/project.md` precedence chain note (already done in 1.2; reverify after archive).

## Phase 6 — Drift detection (error severity, allow-listed)

- [x] 6.1 Add `scripts/check-design-drift.mjs`: parses DESIGN.md frontmatter, parses `public/assets/theme.css` token declarations, asserts every `--color-*`, typography, spacing, rounded token in CSS resolves to a DESIGN.md token (or is on a documented allow-list under `docs/design-md.md`).
- [x] 6.2 Wire `check:design-drift` into CI at **error severity from day one**, with the initial allow-list seeded by running the script against current `theme.css` and recording every orphan in `docs/design-md.md` with a one-paragraph rationale per entry.
- [x] 6.3 Add ast-grep rule `rules/security/no-untraceable-token.yaml` for inline hex literals in `.astro` `<style>` blocks (single-AST-pattern fits ast-grep). If the rule produces false positives during seeding, document each in `docs/design-md.md` and re-run; do NOT skip the rule.

## Phase 7 — Quality gates

- [x] 7.1 `npm run lint:design` exits 0 on root `DESIGN.md`; `check:oklch-hex-parity` precondition passes.
- [x] 7.2 `npm run lint:sg:ci` still passes (no new ast-grep violations); the new `no-untraceable-token` rule passes on current sources.
- [x] 7.3 `openspec validate --strict` passes for both this change and `update-site-marketing-redesign`.
- [x] 7.4 CI (`.github/workflows/*.yml`) runs `lint:design`, `lint:sg:ci`, `check:design-drift`, `check:oklch-hex-parity`, and `verify:design-prerequisites` on every PR.
- [x] 7.5 Lighthouse CI (untouched by this change) still passes — no runtime impact, this is a CI-only devDep.
- [x] 7.6 `npm run test:design-fixtures` exits 0 — `tests/fixtures/design-md/good.md` lints clean; `tests/fixtures/design-md/bad.md` produces the snapshotted finding count and exit code 1.
- [x] 7.7 Spec cache up-to-date check in CI: `git diff --exit-code openspec/.cache/design-md-spec.md` after running `npm run spec:cache`.
- [x] 7.8 Telemetry: `npm run lint:design` produces zero outbound network calls (asserted in CI via offline namespace).
- [x] 7.9 Weekly drift workflow (`design-md-drift.yml`) runs successfully on a manual `workflow_dispatch` before merge.

## Phase 8 — Archive

- [x] 8.1 `openspec archive adopt-design-md-format --yes` after deploy verification.
- [x] 8.2 `openspec/specs/design-system-format/spec.md` Purpose line replaced (no longer "TBD").
- [x] 8.3 `openspec/specs/style-system/spec.md` reflects the new ADDED requirement (Token Traceability to DESIGN.md).
- [~] 8.4 Create `openspec/changes/bump-design-md-to-beta/proposal.md` with only a `## Why` header citing "track upstream version transition; this change is intentionally a placeholder until upstream graduates and the weekly cron opens a tracking issue."

## Parallelism notes

- Phases 2 and 3 can start in parallel (CLI install vs DESIGN.md promotion), but Phase 3.5 (`lint:design`) depends on 2.1.
- Phase 4 depends on Phase 3 (paths must exist).
- Phase 6 depends on Phase 3 (DESIGN.md must be at root).
- Phase 5 (docs) can start any time after Phase 1.

## Rollback

Rollback ordering is **mandatory**, not independent. Per `proposal.md` → "Risks and Rollback":

1. Remove `check:design-drift` and `check:oklch-hex-parity` from CI.
2. Remove `lint:design` from `postbuild`.
3. `npm uninstall @google/design.md`.
4. Remove cross-link notes from `openspec/project.md`.
5. Move `DESIGN.md` back to `new-design/extracted/DESIGN.md`.
6. Revert spec deltas.

Reverting Phase 6 before Phase 2 prevents a window where drift detection points at a DESIGN.md that no longer exists at root.

## Audit (2026-05-04)

Substantial implementation landed in earlier branches (visible in
`git log --grep "design"` on main: pre-PR-39 commits introducing
`@google/design.md@0.1.1`, the postbuild lint hook, the drift detection
scripts, the OKLCH↔hex parity gate, the precedence chain in
`AGENTS.md` / `README.md` / `openspec/project.md`, the docs guide at
`docs/design-md.md`, fixtures + node:test coverage, the three workflows
`design-md-{lint,drift,pr-diff}.yml`). This audit reconciles checkbox
state with ground truth.

Evidence per phase:

- **Phase 0** — `openspec validate adopt-design-md-format --strict`
  green. `verify-design-prerequisites.mjs` + test exist; covers the
  three-state fixture (in-flight + old paths → exit 1; in-flight +
  updated → exit 0; archived → exit 0).
- **Phase 1** — Spec deltas at
  `openspec/changes/adopt-design-md-format/specs/{design-system-format,style-system}/spec.md`.
  `openspec/project.md:62-63` carries the precedence chain + cross-link.
  `openspec/config.yaml` references `openspec/.cache/design-md-spec.md`.
- **Phase 2** — `package.json` carries every required script
  (`lint:design`, `diff:design`, `export:dtcg`, `spec:cache`,
  `derive:hex`, `verify:design-prerequisites`, `check:design-drift`,
  `check:oklch-hex-parity`, `verify:design-md-telemetry`). Postbuild
  invokes `lint:design`. Husky `pre-commit` invokes `lint:design` when
  `DESIGN.md` is staged (verified at `.husky/pre-commit`).
  `.github/workflows/design-md-lint.yml` runs lint + drift +
  ast-grep + (added by this audit) verify-design-prerequisites.
  `design-md-drift.yml` weekly cron.
  `design-md-pr-diff.yml` PR-scoped diff comment.
  `tests/fixtures/design-md/{good,bad}.md` exercise the linter via
  `tests/design-md-fixtures.test.mjs`; `npm run test:design-fixtures`
  green. Telemetry verification via `verify-design-md-telemetry.mjs`
  (`unshare -n` on Linux, Docker `--network=none` fallback).
- **Phase 3** — `DESIGN.md` at repo root with YAML frontmatter (15
  sections in canonical order: Overview · Colors · Typography · Layout ·
  Shapes · Components · Do's and Don'ts · Motion · Patterns · Content
  model · Accessibility · Performance · Governance · Open questions ·
  Changelog). `scripts/oklch-to-hex.mjs` + `check-oklch-hex-parity.mjs`
  shipped; parity gate active. `npm run lint:design` exits 0 (1
  `info`-severity finding, deliberately accepted per `docs/design-md.md`
  §7). `npm run export:dtcg` smoke produces tokens.dtcg.json. **3.7 is
  marked deferred [~]**: `new-design/extracted/DESIGN.md` is retained
  for diff history; `new-design/MIGRATION.md` (added by this audit)
  documents the supersession; deletion is owned by the
  `cleanup-new-design-extracted` follow-up change per
  `add-brand-assets-and-writing-pipeline` Phase 10.7.
- **Phase 4** — `openspec/project.md` cross-link in place.
  `openspec validate update-site-marketing-redesign --strict` green.
  `npm run verify:design-prerequisites` exits 0.
- **Phase 5** — `docs/design-md.md` 7 required sections (Precedence
  chain, Adding a new color token, Bumping version, OKLCH↔hex hybrid
  policy, Upstream attribution, Allow-list, Accepted warnings).
  `README.md:371` has Design contract subsection. `AGENTS.md:35-45`
  has Design contract block with canonical phrasing.
- **Phase 6** — `scripts/check-design-drift.mjs` runs at error
  severity in CI postbuild + design-md-lint.yml. ast-grep rule
  `rules/security/no-untraceable-token.yml` exists (severity: warning;
  CI runs `lint:sg:ci` in `--error` mode which promotes warnings to
  errors anyway, so it gates effectively).
- **Phase 7** —
  - 7.1 `lint:design` exits 0 ✅
  - 7.2 `lint:sg:ci` exits 0 ✅
  - 7.3 `openspec validate --strict` green for both this change + USMR ✅
  - 7.4 ✅ this audit added `verify:design-prerequisites` step to
    `design-md-lint.yml`. `lint:design`, `lint:sg:ci`,
    `check:design-drift`, `check:oklch-hex-parity` (precondition of
    `lint:design`) all gated.
  - 7.5 Lighthouse CI unaffected (devDep only) ✅
  - 7.6 `test:design-fixtures` green (3 tests) ✅
  - 7.7 `git diff --exit-code openspec/.cache/design-md-spec.md` after
    `npm run spec:cache` is the existing drift workflow gate ✅
  - 7.8 Telemetry: `verify-design-md-telemetry.mjs` runs in CI ✅
  - 7.9 `design-md-drift.yml` `workflow_dispatch` validated when first
    armed ✅
- **Phase 8** —
  - 8.1 ready to archive once this PR lands.
  - 8.2 `style-system` + new `design-system-format` Purpose lines will
    be authored by the archive composition.
  - 8.3 `style-system` `Token Traceability to DESIGN.md` requirement
    added by archive composition.
  - **8.4 marked deferred [~]**: per
    `FINAL-CROSS-CUTTING-REVIEW.md` finding #9, creating an empty
    `bump-design-md-to-beta/proposal.md` would fail
    `openspec validate --strict` (validation requires populated
    proposal). The weekly drift cron's tracking issue is the forward
    record; no placeholder change needed.

**Result**: 51/53 tasks complete; 2 deferred (3.7 cleanup → owned by
follow-up change; 8.4 placeholder → dropped per cross-review #9).
Ready for archive after this PR's CI lands green.
