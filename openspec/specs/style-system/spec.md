# style-system Specification

## Purpose
TBD - created by archiving change fix-styling-refactor-gaps. Update Purpose after archive.
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

