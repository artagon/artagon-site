# design-system-format Specification

## Purpose
TBD - created by archiving change adopt-design-md-format. Update Purpose after archive.
## Requirements
### Requirement: Canonical DESIGN.md Location

The repository MUST contain exactly one `DESIGN.md` file at the repository root. This file is the canonical visual identity contract for `artagon.com`.

#### Scenario: Root file exists and is unique

- **WHEN** the repository is cloned and `find . -name DESIGN.md -not -path './node_modules/*'` runs
- **THEN** exactly one match is reported and that match is `./DESIGN.md`.

#### Scenario: No competing DESIGN.md elsewhere

- **WHEN** a contributor adds a `DESIGN.md` under `src/` or `new-design/`
- **THEN** the build fails with a CI check citing the duplicate location and the canonical path.

### Requirement: Upstream Format Adoption

`DESIGN.md` MUST conform to the format spec published at <https://github.com/google-labs-code/design.md> (Apache-2.0). The adopted format version is recorded in `DESIGN.md` frontmatter (`version:` field) and pinned by commit SHA in `openspec/config.yaml`.

#### Scenario: Frontmatter declares version

- **WHEN** `DESIGN.md` is parsed
- **THEN** the YAML frontmatter contains a `version:` field whose value matches the version pinned in `openspec/config.yaml`.

#### Scenario: Version drift requires explicit change

- **WHEN** an upgrade to a newer upstream version is desired
- **THEN** a separate OpenSpec change (`bump-design-md-to-<version>`) MUST be authored and approved before the version pin is changed.

### Requirement: Lint Gate

`npm run lint:design` MUST execute `npx @google/design.md lint DESIGN.md` and exit non-zero on any `error`-severity finding. The script MUST run as part of `npm run postbuild` and MUST run in the same CI workflow as `npm run lint:sg:ci`.

#### Scenario: Error-severity finding fails the build

- **WHEN** a contributor introduces a broken token reference (e.g., `{colors.nonexistent}` in a component definition)
- **THEN** `npm run build` fails after `astro build` succeeds, with `lint:design` reporting `broken-ref` at error severity.

#### Scenario: Warnings surface in the build log without failing

- **WHEN** the linter reports a `section-order` or `contrast-ratio` warning
- **THEN** the build succeeds but the CI run log includes the warning text and severity.

### Requirement: YAML Frontmatter Token Coverage

`DESIGN.md` frontmatter MUST declare token groups for `colors`, `typography`, `spacing`, and `rounded`. The `components` group is required and MUST cover at least: `nav`, `footer`, `glow-tag`, `standards-chip`, `trust-chain-row`, `button-primary`, `button-secondary`, `code-block`. The `name` and `description` fields MUST be present and non-empty.

#### Scenario: Missing required token group fails

- **WHEN** a contributor removes the `colors:` block from frontmatter
- **THEN** `lint:design` fails with a non-conformance finding citing the missing group.

#### Scenario: Required components defined

- **WHEN** the `components:` group is parsed
- **THEN** every component name in the required list is present, each with at least `backgroundColor` and `textColor` properties (or token references resolving to such).

### Requirement: Section Order

The markdown body of `DESIGN.md` MUST present canonical sections in the upstream-defined order: `Overview · Colors · Typography · Layout · Elevation & Depth · Shapes · Components · Do's and Don'ts`. Sections MAY be omitted; non-canonical sections MAY appear AFTER all present canonical sections.

#### Scenario: Canonical order preserved

- **WHEN** `lint:design` runs against `DESIGN.md`
- **THEN** no `section-order` warning is emitted for canonical sections.

#### Scenario: Custom section appears at end

- **WHEN** the body contains a custom section (e.g., "Brand voice")
- **THEN** that section appears AFTER all canonical sections that are present and the linter does not flag it.

### Requirement: Precedence

`openspec/specs/*` SHALL govern behavior. `DESIGN.md` SHALL govern visual presentation (token values, section conventions, component visual contracts). Implementation MUST trace to both and is never the source of truth. On conflict between `DESIGN.md` and `openspec/specs/<capability>/spec.md`, the spec wins; `DESIGN.md` MUST be updated to match in the same OpenSpec change. `README.md`, `AGENTS.md`, and `docs/design-md.md` MUST use this canonical phrasing without paraphrase.

#### Scenario: Implementation cited as wrong

- **WHEN** a code change conflicts with `DESIGN.md`
- **THEN** the code is changed to match `DESIGN.md` (or a `DESIGN.md` change is proposed) — the implementation is never the source of truth.

#### Scenario: Spec wins over DESIGN.md

- **WHEN** `openspec/specs/style-system/spec.md` requires a stricter contrast ratio than `DESIGN.md` documents
- **THEN** the spec governs the implementation and `DESIGN.md` is updated under the same OpenSpec change.

#### Scenario: Canonical phrasing reused verbatim

- **WHEN** `AGENTS.md` or `docs/design-md.md` describes the precedence
- **THEN** they use the exact phrase "openspec/specs/\* govern behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change."

### Requirement: Spec Context Cache

`openspec/.cache/design-md-spec.md` MUST exist and be the verbatim output of `npx @google/design.md spec --format markdown` against the pinned CLI version. The cache MUST be committed to git. CI MUST fail if the committed cache diverges from a fresh regeneration.

#### Scenario: Cache up-to-date in CI

- **WHEN** CI runs `npm run spec:cache && git diff --exit-code openspec/.cache/design-md-spec.md`
- **THEN** the diff is empty and the check passes.

#### Scenario: Stale cache fails CI

- **WHEN** the CLI version is bumped without regenerating the cache
- **THEN** the diff is non-empty and CI fails with instructions to run `npm run spec:cache`.

### Requirement: OKLCH-Hex Parity

YAML frontmatter colors carry sRGB hex; prose carries OKLCH. `scripts/oklch-to-hex.mjs` (`npm run derive:hex`) MUST regenerate the canonical conversion table in `docs/design-md.md` from prose-cited OKLCH triples. `scripts/check-oklch-hex-parity.mjs` (`npm run check:oklch-hex-parity`) MUST run as a precondition to `lint:design`; it MUST fail the build if any frontmatter hex value differs from the OKLCH-derived hex by more than 1 LSB per sRGB channel.

#### Scenario: Conversion table is auto-generated

- **WHEN** a contributor edits an OKLCH triple in `DESIGN.md` prose and runs `npm run derive:hex`
- **THEN** `docs/design-md.md` conversion table updates to reflect the new mapping AND `DESIGN.md` frontmatter hex updates to match.

#### Scenario: Drift between OKLCH prose and YAML hex fails

- **WHEN** a contributor edits an OKLCH triple in prose without running `derive:hex`, leaving the YAML hex stale
- **THEN** `npm run check:oklch-hex-parity` exits non-zero citing the offending color name and the LSB-distance.

#### Scenario: Sub-LSB drift accepted

- **WHEN** the OKLCH-derived hex differs from the YAML hex by ≤ 1 LSB per channel (visually undetectable round-trip noise)
- **THEN** `check:oklch-hex-parity` passes.

### Requirement: Upstream Liveness Probe

`.github/workflows/design-md-drift.yml` MUST run on a weekly cron and execute three checks: (1) regenerate the spec cache and `git diff --exit-code` it; (2) query `gh api repos/google-labs-code/design.md` and fail the workflow if `archived=true` OR the last push timestamp is more than 90 days old; (3) run `tests/fixtures/design-md/{good,bad}.md` snapshot tests asserting linter exit code and finding count. Failure MUST open a tracking issue; the workflow MUST NOT auto-PR an upgrade and MUST NOT push commits.

The workflow MUST declare an explicit minimum-privilege `permissions:` block at workflow scope: `permissions: { contents: read, issues: write }` (read for repo content; write for opening tracking issues only). All `uses:` references MUST be pinned by full 40-hex commit SHA with a `# v<semver>` comment recording the human-readable version. Dependabot's `package-ecosystem: github-actions` (configured under `add-brand-assets-and-writing-pipeline`'s `site-writing-pipeline` requirement) covers SHA-pin upgrades for this workflow as well.

#### Scenario: Upstream archives

- **WHEN** the upstream repo is archived
- **THEN** the weekly workflow fails and a tracking issue is opened citing the archive status and the proposal's vendor-on-archive exit strategy.

#### Scenario: Upstream goes stale

- **WHEN** the upstream repo's last push is more than 90 days ago
- **THEN** the weekly workflow fails and a tracking issue is opened.

#### Scenario: Linter behavior regression caught by fixtures

- **WHEN** the upstream linter changes `broken-ref` detection scope without changing spec markdown text
- **THEN** the snapshotted finding count for `tests/fixtures/design-md/bad.md` diverges and the weekly workflow fails.

