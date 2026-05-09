# style-system Specification

## Purpose

This capability defines the contracts that govern the artagon-site
visual system: theme-aware token fallbacks (so `color-mix()` usage
preserves theme intent on browsers without support), the reusable UI
component contract (`Card` / `SectionHeader` / `FeatureList` under
`src/components/ui/` MUST accept both `class` and `className` and
forward arbitrary HTML attributes to the root), and the solid /
domain / pillar / component / product / vision card variant family.
The capability was created by archiving the
`fix-styling-refactor-gaps` change
(`openspec/changes/archive/2026-01-02-fix-styling-refactor-gaps/`)
and consolidates the styling-system contracts that the underlying
`refactor-styling-architecture` change first introduced (archived
2026-05-04). It will be MODIFIED by `update-site-marketing-redesign`
(USMR Phase 2 OKLCH palette + cascade-layer additions, in flight)
and by `self-host-woff2-fonts` (font-payload budget + WOFF2
metric-overrides, in flight).

**KNOWN SPEC DRIFT (pt397 archaeology — token canonicalization)**:
The "Global Theme Consistency" Requirement Scenario below (line
64-67) uses `--brand-teal` as the example primary-color variable
("WHEN the `--brand-teal` variable is updated in `theme.css`,
THEN all 'Hero' sections and 'Buttons' across the site reflect
the change immediately"). That Scenario reflects the pre-USMR
state when `--brand-teal` was the canonical primary-color
token. Under USMR pt86 the token system canonicalized to
`--accent` and `--brand-teal` was demoted to a retained ALIAS
(`public/assets/theme.css:276,285` declare
`--brand-teal: var(--accent)`); updating `--brand-teal` today
would NOT propagate the change because nothing downstream
consumes the alias directly — components consume `--accent`. The
canonical update site is now `--accent`. The Scenario at line
64-67 needs a follow-up amendment (separate OpenSpec proposal)
to either point at `--accent` directly OR document the alias
chain. Per OpenSpec discipline, pt397 is doc-scope (Purpose
backfill) only and does NOT modify the Requirement / Scenario
text — Requirements changes go through proposals, not direct
edits. Same pattern as pt395 SearchAction Purpose backfill in
manage-site-links/spec.md.

## Requirements

### Requirement: Theme-Aware Fallback Tokens

Theme token fallbacks for `color-mix` usage MUST be defined per theme or derived from theme variables so theme changes preserve intended hues when fallbacks are used.

#### Scenario: Theme uses fallback tokens

- **WHEN** the site is rendered in a browser without `color-mix` support and `data-theme="twilight"` is active
- **THEN** gradient and border fallbacks use twilight theme colors rather than midnight defaults.

### Requirement: UI Component Attribute Compatibility

Card, SectionHeader, and FeatureList components MUST accept both `class` and `className`, merge them, and forward remaining HTML attributes to the root element.

#### Scenario: SectionHeader forwards standard attributes

- **WHEN** a developer renders `<SectionHeader id="architectural-principles" data-testid="section">`
- **THEN** the root element includes the `id` and `data-testid` attributes alongside the component classes.

### Requirement: Solid Card Variant

The Card component MUST support `variant="solid"`, applying the `.ui-card--solid` utility to match the solid card styling.

#### Scenario: Card renders solid styling

- **WHEN** a developer renders `<Card variant="solid">`
- **THEN** the root element includes the `.ui-card--solid` class.

### Requirement: Reusable UI Components

Common UI patterns (Cards, Section Headers, Feature Lists) MUST be implemented as reusable Astro components or global CSS classes, rather than duplicated in page-scoped styles.

#### Scenario: Developer adds a new page

- **WHEN** a developer creates a new page with a "Card" layout
- **THEN** they can import the `Card` component or use the `.ui-card` utility without copying CSS.

### Requirement: Global Theme Consistency

Visual attributes like gradients, spacing, and typography hierarchies MUST be defined in the global theme variables or CSS, not hardcoded in page styles.

#### Scenario: Changing Primary Color

- **WHEN** the `--brand-teal` variable is updated in `theme.css`
- **THEN** all "Hero" sections and "Buttons" across the site reflect the change immediately.

### Requirement: Dev-Only Tweaks Panel

The site MUST provide a runtime "Tweaks" panel during development that lets designers exercise the design system across accent, density, theme, hero-font, and grid-visibility permutations. The panel MUST NOT ship in production builds.

#### Scenario: Tweaks panel renders in dev

- **WHEN** a developer runs `npm run dev` and loads any route in a browser
- **THEN** a `<div class="tweaks-host">` is present in the DOM hosting an `<astro-island>` for `TweaksPanel` (the React island)
- **AND** a trigger button labeled "⚙ tweaks" is fixed at the bottom-right corner of the viewport
- **AND** clicking the trigger opens a panel containing fieldsets for Accent, Density, Theme, Display font, and Background grid.

#### Scenario: Tweaks panel does not ship in production

- **WHEN** `npm run build` completes
- **THEN** no production HTML file under `.build/dist/` contains `tweaks-host`, `tweaks-trigger`, or `TweaksPanel` references
- **AND** no production page fetches the Tweaks island chunk at runtime (the orphan `_astro/TweaksPanel.[hash].js` may exist on disk but no HTML references it).

#### Scenario: Tweaks panel state persists across reloads

- **WHEN** a developer changes any control (accent, density, theme, hero-font, or grid)
- **AND** reloads the page
- **THEN** the panel restores the previously selected values
- **AND** the corresponding `data-*` attribute on `<html>` (or `.no-grid` class on `<body>`) reflects the persisted value before paint completes.

#### Scenario: Corrupted localStorage falls back to defaults

- **WHEN** `localStorage["artagon.tweaks.v1"]` contains invalid JSON or a partially-valid object
- **THEN** the panel renders with default values for any missing or invalid field
- **AND** does not throw or block page initialization
- **AND** valid fields in the stored object are preserved.

#### Scenario: Keyboard shortcut toggles the panel

- **WHEN** a developer presses `⌘.` (or `Ctrl+.` on non-Mac)
- **THEN** the panel opens if closed, or closes if open
- **AND** pressing `Escape` while the panel is open closes it.

### Requirement: Tweaks State Schema

The Tweaks panel state schema MUST be parseable from arbitrary `unknown` input (e.g. `JSON.parse` of localStorage) without throwing, falling back per-field to documented defaults.

#### Scenario: parse handles malformed input

- **WHEN** the `parse` function from `src/scripts/tweaks-state.ts` (used by both the React island in `src/components/TweaksPanel.tsx` and the node:test suite) receives `null`, `undefined`, a string, a number, or a non-object value
- **THEN** it returns the `DEFAULTS` object
- **AND** does not throw.

#### Scenario: parse falls back per-field

- **WHEN** the input object has some valid fields and some invalid fields (e.g. `{ accent: "violet", density: "tight" }`)
- **THEN** the result preserves valid fields verbatim
- **AND** substitutes the default value for each invalid field independently.

#### Scenario: DEFAULTS is a fixed point

- **WHEN** `parse(DEFAULTS)` is called
- **THEN** the result deep-equals `DEFAULTS`
- **AND** every field of `DEFAULTS` passes its corresponding type guard.

### Requirement: Tweaks DOM Contract

The Tweaks panel MUST project state onto the document via `data-*` attributes on `<html>` and a `.no-grid` class on `<body>`, matching the contract used by `public/assets/theme.css` selectors.

#### Scenario: state changes update DOM attributes

- **WHEN** a developer selects accent="violet"
- **THEN** `document.documentElement.getAttribute('data-accent')` returns `"violet"`
- **AND** the same applies for `data-density`, `data-theme`, and `data-hero-font` for their respective controls.

#### Scenario: showGrid toggles body class

- **WHEN** a developer disables the Background grid switch
- **THEN** `document.body.classList.contains('no-grid')` is `true`
- **AND** re-enabling sets it back to `false`.

### Requirement: Token Traceability to DESIGN.md

Every `--color-*`, typography, spacing, and rounded token defined in `public/assets/theme.css` MUST trace to a token declared in the root `DESIGN.md` YAML frontmatter (or be on the explicit allow-list documented in `docs/design-md.md`). `npm run check:design-drift` MUST verify the trace at **error severity**; CI MUST fail on any unallow-listed orphan. The allow-list seeds from current orphans at adoption time and each entry MUST cite a one-paragraph rationale.

#### Scenario: New token defined in both files

- **WHEN** a contributor adds `--color-warning: #B8422E` to `theme.css`
- **THEN** the same token name appears under `colors:` in `DESIGN.md` frontmatter, and `check:design-drift` passes.

#### Scenario: Untraced token fails the build

- **WHEN** a contributor adds a token to `theme.css` without updating `DESIGN.md` and the token is not on the allow-list
- **THEN** `check:design-drift` exits non-zero with a finding naming the orphaned token, the `theme.css` line, and the suggested DESIGN.md placement; the build fails.

#### Scenario: Allow-list bypass for legacy or experimental tokens

- **WHEN** an experimental token is intentionally not in DESIGN.md and is added to the allow-list under `docs/design-md.md` with a rationale paragraph
- **THEN** `check:design-drift` does not flag that token but logs the allow-list match for audit; the build passes.

#### Scenario: Allow-list entry without rationale fails

- **WHEN** a contributor adds a token to the allow-list without a rationale paragraph
- **THEN** `check:design-drift` rejects the allow-list entry and exits non-zero, naming the missing rationale.
