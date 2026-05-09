## ADDED Requirements

### Requirement: Color Token Contrast Annotations

The `DESIGN.md` color-token table SHALL annotate every shipping text-tier and non-text-tier combination with its computed WCAG contrast ratio. Combinations that fall below the WCAG 2.1 AA floor (4.5:1 for text, 3:1 for non-text) SHALL either be (a) excluded from the production palette or (b) flagged with the contexts where they are NOT permitted.

#### Scenario: Adding a new color token requires a contrast row

- **WHEN** a contributor adds a new `--<name>` color token to `public/assets/theme.css`
- **THEN** `DESIGN.md` §"Color tokens" gains a row showing that token's contrast ratio against every relevant background token, and `tests/contrast-tokens.test.mts` exercises the new pair on next vitest run

#### Scenario: A token shift below WCAG AA fails the gate

- **WHEN** a contributor lowers `--ok`'s lightness from `0.80` to `0.55`, dropping its contrast against `--bg-alt` below 4.5:1 for text use
- **THEN** `npm run test:vitest` exits non-zero with the failing token pair cited

### Requirement: Focus Indicator Contract

Every interactive element styled by `style-system` (links, buttons, the `ui-*` utility-class family, scoped `.btn` / `.btn.primary` rules) SHALL define an explicit `:focus-visible` rule. The default rule is a 2 px solid `var(--accent)` outline with 2 px offset, visible against every shipping background token.

#### Scenario: ui-card receives :focus-visible

- **WHEN** a keyboard user tabs to a `.ui-card` instance whose template wraps an `<a>` or interactive element
- **THEN** the focus indicator is a 2 px `var(--accent)` outline with 2 px offset; the browser's default focus ring is suppressed via `outline: none` only inside the matching `:focus-visible` block (never globally)

#### Scenario: Custom focus styles use --accent only

- **WHEN** a component defines a per-component focus color
- **THEN** the value resolves to `var(--accent)` (or a documented derivative such as `color-mix(in oklab, var(--accent) 80%, transparent)`); raw color literals are not permitted (enforced by `lint:tokens`)
