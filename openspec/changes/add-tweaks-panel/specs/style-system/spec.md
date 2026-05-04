# style-system spec delta — add-tweaks-panel

## ADDED Requirements

### Requirement: Dev-Only Tweaks Panel

The site MUST provide a runtime "Tweaks" panel during development that lets designers exercise the design system across accent, density, theme, hero-font, and grid-visibility permutations. The panel MUST NOT ship in production builds.

#### Scenario: Tweaks panel renders in dev

- **WHEN** a developer runs `npm run dev` and loads any route in a browser
- **THEN** an `<artagon-tweaks>` element is present in the DOM
- **AND** a trigger button labeled "⚙ tweaks" is fixed at the bottom-right corner of the viewport
- **AND** clicking the trigger opens a panel containing fieldsets for Accent, Density, Theme, Display font, and Background grid.

#### Scenario: Tweaks panel does not ship in production

- **WHEN** `npm run build` completes
- **THEN** `grep -r 'artagon-tweaks\|tweaks-panel\|tweaks-trigger' .build/dist/` returns no matches in any HTML, CSS, or JS file
- **AND** no network request for `tweaks.ts` or `tweaks-state.ts` is made by any production page.

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

- **WHEN** the `parse` function from `src/scripts/tweaks-state.ts` receives `null`, `undefined`, a string, a number, or a non-object value
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
