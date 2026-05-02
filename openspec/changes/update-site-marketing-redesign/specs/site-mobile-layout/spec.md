## ADDED Requirements

### Requirement: No Global Viewport Scale

The site MUST NOT use a global `transform: scale()` fallback to fit content on small viewports. Responsive layouts MUST be achieved via fluid type, container queries, and media queries.

#### Scenario: No transform:scale on body

- **WHEN** the home route is loaded at 360 px viewport
- **THEN** the computed style of `<body>` (and any wrapping container) has no `transform` containing `scale(`.

### Requirement: Three Global Breakpoints

The site SHALL define exactly three global breakpoints in `theme.css`: `--bp-sm: 480`, `--bp-md: 720`, `--bp-lg: 1080`. Primitive-internal container-query thresholds (e.g., `TwoCol` at 640 px) are deliberately distinct from globals and documented in `design.md` §5.

#### Scenario: Trust chain stacks below 720 px

- **WHEN** the home route is rendered at 480 px
- **THEN** the `TrustChain` `<ol>` items are stacked vertically.

#### Scenario: Trust chain is horizontal above 1080 px

- **WHEN** the home route is rendered at 1280 px
- **THEN** the `TrustChain` items are arranged horizontally.

### Requirement: Tap Targets ≥ 44 × 44 CSS px

All interactive elements MUST present a tap target of at least 44 × 44 CSS px. Visual size MAY be smaller if hit-area padding extends the interactive region. The set of interactive elements covered by this requirement explicitly includes: buttons, links in nav and footer, `StandardChip`, the hamburger toggle, the GitHub icon-button (DESIGN.md visual size 34 px), the theme toggle, the `TrustChainTooltip` close button (`×`), and any `<button>` or `<a>` rendered inside the `TrustChain` row.

#### Scenario: Standards chip meets target

- **WHEN** a `StandardChip` is rendered at 360 px viewport
- **THEN** its bounding hit-area measured by Playwright is ≥ 44 × 44 CSS px.

#### Scenario: GitHub icon-button meets target

- **WHEN** the nav GitHub icon-button is rendered at any viewport
- **THEN** its bounding hit-area measured by Playwright is ≥ 44 × 44 CSS px even though its visual size is 34 px.

#### Scenario: Hamburger toggle meets target

- **WHEN** the hamburger toggle is rendered at < 720 px viewport
- **THEN** its bounding hit-area measured by Playwright is ≥ 44 × 44 CSS px.

#### Scenario: TrustChainTooltip close button meets target

- **WHEN** a locked-open `TrustChainTooltip` is rendered on mobile
- **THEN** the `×` close button's bounding hit-area is ≥ 44 × 44 CSS px.

#### Scenario: Theme toggle meets target

- **WHEN** the footer theme toggle is rendered at any viewport
- **THEN** its bounding hit-area is ≥ 44 × 44 CSS px.

### Requirement: TrustChainTooltip Accessibility

`TrustChainTooltip.astro` MUST render as `role="dialog"` with `aria-modal="false"` (it sits beside its trigger row and does NOT trap focus). Each `TrustChain` row MUST be `tabindex="0"` and operable by Enter/Space to toggle a locked-open tooltip; an explicit `<button aria-label="Explain {stage}">` MUST also be rendered next to each row label as the only discoverable affordance for switch and keyboard-only users (the redundant button MUST NOT be removed even when hover works for sighted mouse users). Each row MUST carry `aria-describedby` pointing at its open tooltip's id. Esc MUST dismiss any open tooltip from anywhere on the page. Under `prefers-reduced-motion: reduce`, open/close transitions MUST drop to opacity-only at ≤ 80 ms with no transform.

#### Scenario: Keyboard user opens and dismisses tooltip

- **WHEN** a keyboard-only user tabs to a `TrustChain` row and presses Enter
- **THEN** the tooltip opens, `role="dialog"` is set, `aria-describedby` resolves on the row; pressing Esc dismisses it and focus returns to the row.

#### Scenario: Touch user opens via info button

- **WHEN** a touch user taps the `ⓘ` info button on a row
- **THEN** the tooltip opens as a bottom-anchored sheet with a backdrop and a visible close button.

#### Scenario: Reduced motion is opacity-only

- **WHEN** a user has `prefers-reduced-motion: reduce` enabled and toggles a tooltip
- **THEN** the open/close transition uses opacity only at ≤ 80 ms (no transform, no scale, no slide).

### Requirement: TrustChain Cycling Reduced Motion

The `TrustChain` cycling animation MUST honor `prefers-reduced-motion: reduce` by stopping on a complete PERMIT or DENY end-state, NEVER mid-transition or mid-cycle. Under reduced motion, `aria-live="polite"` updates from cycling MUST be suppressed; only the static initial state is announced.

#### Scenario: Reduced motion freezes on complete state

- **WHEN** a user has `prefers-reduced-motion: reduce` and visits the home route
- **THEN** the `TrustChain` displays a complete scenario (PERMIT or DENY end-state) and does not cycle; `aria-live` does not announce subsequent state changes.

### Requirement: Non-Color Signal for Decision Outcomes

The `TrustChain` MUST convey PERMIT, DENY, and WARN outcomes through at least one non-color channel (text label, icon shape, or ARIA state) in addition to color. This satisfies WCAG 1.4.1 Use of Color and remains intelligible under `forced-colors: active` and `prefers-contrast: more`.

#### Scenario: Non-color signal present

- **WHEN** a `TrustChain` shows a DENY outcome
- **THEN** the rendered DOM contains a text label (e.g., "DENY"), an icon shape distinct from PERMIT, OR an ARIA state distinguishing the outcome — independent of the `--bad` color token.

#### Scenario: Forced-colors mode keeps decision legible

- **WHEN** `forced-colors: active` is enabled
- **THEN** the PERMIT vs DENY distinction remains visible via the non-color signal even though the semantic colors map to system colors.

### Requirement: Forced-Colors Mode Sitewide

Under `forced-colors: active`, the following UI affordances MUST remain visible using `CanvasText` / `Highlight` system colors and MUST NOT rely on `backdrop-filter` or `box-shadow` for state communication: the nav `aria-current="page"` indicator, the `StandardChip` outline, the hamburger toggle outline, the `TrustChain` stage markers, and the theme-toggle pressed state.

#### Scenario: Active nav item visible under forced colors

- **WHEN** `forced-colors: active` is enabled and the user is on `/platform`
- **THEN** the Platform nav item shows a visible active indicator using system colors (not solely the `backdrop-filter` blur or accent underline).

#### Scenario: Hamburger toggle visible under forced colors

- **WHEN** `forced-colors: active` is enabled at < 720 px viewport
- **THEN** the hamburger toggle has a visible border/outline using system colors.

### Requirement: Single H1 per Page

Every marketing route MUST contain exactly one `<h1>` element.

#### Scenario: Lint catches double h1

- **WHEN** a route is built with two `<h1>` elements
- **THEN** `scripts/lint-meta.mjs` exits non-zero citing the offending route.

### Requirement: No Horizontal Overflow at 360 px

No marketing route SHALL produce horizontal scroll at 360 px viewport.

#### Scenario: Playwright asserts no overflow

- **WHEN** the mobile-layout test suite loads each route at 360 px
- **THEN** `document.documentElement.scrollWidth <= window.innerWidth` is true for every route.
