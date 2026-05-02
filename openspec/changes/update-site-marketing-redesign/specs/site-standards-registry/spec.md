## ADDED Requirements

### Requirement: Typed Standards Registry

`src/data/standards.ts` SHALL export a typed array of standards entries. Each entry MUST include `id` (kebab-case), `label` (display string), `href` (canonical spec URL), `family` (e.g. "IETF", "OpenID", "FIDO", "W3C", "NIST", "EU"), `version` (string), `summary` (≤ 80 chars), `longSummary` (≤ 280 chars). Optional fields: `tooltip`, `extends?` (string[]), `uses?` (string[]), `lastVerified?` (ISO date).

#### Scenario: Initial registry has eight entries

- **WHEN** the registry is loaded at build
- **THEN** it contains entries for: `gnap`, `oid4vc`, `fido2`, `did-core`, `vc-data-model`, `nist-800-63`, `eidas-2`, `dpop`.

#### Scenario: Adding an entry without summary fails

- **WHEN** a contributor adds an entry missing `summary`
- **THEN** TypeScript compilation fails and `astro check` reports the error.

### Requirement: StandardChip Primitive

`StandardChip.astro` SHALL render a clickable pill linking to the registry entry's `href`. The link MUST use `target="_blank"` and `rel` containing both `noopener` and `noreferrer` tokens (order-independent). The chip MUST present a tap target of at least 44 × 44 CSS px (achieved via hit-area padding if visual size is smaller). The caption MUST be visible on `:hover` OR `:focus-visible` for desktop pointer/keyboard users, AND visible by default under `@media (hover: none)` for touch users; this satisfies WCAG 1.4.13 Content on Hover or Focus and WCAG 2.1.1 Keyboard (caption is dismissable, hoverable, and persistent).

#### Scenario: External link is safe (rel enforced)

- **WHEN** a build-time check inspects every `<a target="_blank">` in `dist/`
- **THEN** every such anchor carries `noopener` and `noreferrer` tokens in `rel` (order-independent); `scripts/lint-standards.mjs` (or a dedicated check) MUST fail the build if any `target="_blank"` link omits either token.

#### Scenario: Touch tap target

- **WHEN** the chip is rendered on a 360 px viewport
- **THEN** its hit area measured by Playwright is ≥ 44 × 44 CSS px.

#### Scenario: Keyboard-only desktop user reaches caption

- **WHEN** a desktop user with no pointer (keyboard-only navigation) tabs onto a `StandardChip`
- **THEN** the caption becomes visible via `:focus-visible` and persists until focus moves elsewhere; the caption is dismissable by Esc.

### Requirement: StandardsRow Primitive

`StandardsRow.astro` SHALL render a list of `StandardChip` instances inside `<ul role="list">` with semantic list markup preserved (overrides the default Safari `list-style: none` removal of role). The component MUST accept a filter (e.g. `family="IETF"`) for rendering subsets.

#### Scenario: Filter by family

- **WHEN** a developer renders `<StandardsRow family="W3C">`
- **THEN** only `did-core` and `vc-data-model` chips appear in the rendered list.

### Requirement: Single-Source Consumption

The hero, footer, and `/standards` page MUST consume the registry; no `.astro` or `.mdx` file SHALL hand-roll a standards link to a URL listed in the registry.

#### Scenario: Hand-rolled link caught by lint

- **WHEN** a contributor adds `<a href="https://www.rfc-editor.org/rfc/rfc9449">DPoP</a>` to a `.mdx` file
- **THEN** `scripts/lint-standards.mjs` flags the file:line and suggests `<StandardChip id="dpop" />`.

#### Scenario: Allow pragma suppresses lint

- **WHEN** a long-form post intentionally references DPoP via raw URL with a `// lint-standards:allow citation` comment on the same line
- **THEN** `scripts/lint-standards.mjs` does not flag that line.

### Requirement: DefinedTerm JSON-LD Emission

The `/standards` page MUST emit a `schema.org/DefinedTermSet` JSON-LD block enumerating all registry entries as `DefinedTerm` items, with `@id`, `name`, `description` (from `longSummary`), and `url` (from `href`).

#### Scenario: Validation passes

- **WHEN** `scripts/validate-structured-data.mjs` parses the built `/standards` HTML
- **THEN** the DefinedTermSet block is present, well-formed, and every `url` is absolute.
