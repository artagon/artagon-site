## ADDED Requirements

### Requirement: Tap Target Floor

Every interactive element SHALL have a hit area of at least 44 × 44 CSS pixels per WCAG 2.5.5 (Level AAA, adopted as project floor for marketing routes). The visible target may be smaller for design fidelity if and only if invisible padding (e.g., a `::before` pseudo-element or transparent `<button>` padding) extends the hit area to the 44 × 44 minimum.

#### Scenario: Scenario picker dot is keyboard- and pointer-tappable

- **WHEN** a user with motor impairment taps anywhere in a 44 × 44 region centered on a `.trust-chain__scenario-dot`
- **THEN** the dot's `onClick` fires and the trust-chain scenario advances to that index

#### Scenario: Visible 9 px dot is preserved

- **WHEN** an automated visual snapshot of `/` runs in chromium-linux
- **THEN** the rendered scenario-picker dots remain 9 × 9 CSS pixels (no visible size change vs. the pre-change baseline)

### Requirement: Touch Interaction Parity

Every component whose pointer affordance is hover-driven SHALL provide an equivalent tap-driven path on touch devices. The tap-driven path SHALL announce its current state via `aria-pressed` so screen-reader users on touch devices can perceive the affordance.

#### Scenario: Stage row tap toggles pressed state

- **WHEN** a user taps a `.trust-chain__stage` row on a touch device
- **THEN** the row's `aria-pressed` flips from `false` to `true` and the decision card swaps to that stage's pass / fail claim

#### Scenario: Tapping a different stage row releases the prior pressed state

- **WHEN** a user has tapped stage 0 (pressed=true) and then taps stage 2
- **THEN** stage 0's `aria-pressed` flips back to `false` and stage 2's flips to `true`; the decision card shows stage 2's claim

#### Scenario: Mouse hover continues to work alongside tap-toggle

- **WHEN** a user with a mouse hovers a stage row that is not pressed
- **THEN** the decision card swaps to that stage's claim transiently (without setting `aria-pressed`), and restores the scenario's `finalClaim` on mouseout

### Requirement: Color Contrast Floor

Every text token combination (`--text / --muted / --ok / --bad / --warn / --accent` × `--bg / --bg-alt / --bg-1 / --bg-2`) used for body, label, or status text SHALL meet WCAG 2.1 AA contrast ratio of 4.5:1. Every non-text combination used for icons, focus indicators, and decorative-but-meaningful UI SHALL meet 3:1.

#### Scenario: Token-pair audit gate

- **WHEN** `npm run test:vitest` runs at PR time
- **THEN** `tests/contrast-tokens.test.mts` parses `public/assets/theme.css`, computes contrast ratios for every shipping token-pair, and fails the gate if any text-pair is below 4.5:1 or any non-text-pair is below 3:1

#### Scenario: DESIGN.md table records every ratio

- **WHEN** a maintainer reads `DESIGN.md` §"Color tokens"
- **THEN** the rendered token table shows the computed contrast ratio (and pass/fail status) for every text and non-text combination in the matrix

### Requirement: Visible Focus Indicators

Every interactive element (links, buttons, role="button", role="tab", form controls) SHALL render an explicit `:focus-visible` indicator: minimum 2 px solid `var(--accent)` outline with 2 px offset. Browser-default focus rings (which can be invisible against tinted backgrounds) SHALL NOT be relied on.

#### Scenario: Stage row receives keyboard focus

- **WHEN** a keyboard user tabs to a `.trust-chain__stage` row
- **THEN** the row renders a 2 px `var(--accent)` outline with 2 px offset visible against `var(--bg-alt)` background

#### Scenario: On-ramp CTA receives keyboard focus

- **WHEN** a keyboard user tabs to the on-ramp `Apply as a design partner` button
- **THEN** the button renders the same 2 px `var(--accent)` outline (visually distinct from `:hover`)

### Requirement: Forced Colors Mode

Components SHALL render correctly under `@media (forced-colors: active)`. `color-mix()` and `box-shadow` glow effects SHALL be replaced with system-color overrides keyed off `Canvas / CanvasText / LinkText / ButtonFace / ButtonText / Highlight / HighlightText / Mark`.

#### Scenario: Trust-chain renders in Windows High Contrast

- **WHEN** the user agent reports `forced-colors: active`
- **THEN** `.trust-chain__stage.is-pass` borders use `Highlight`, `.is-fail` uses `Mark`, and the decision card border + text resolve to system colors with no transparent `color-mix()` artifacts

#### Scenario: Hero glow-tag still readable in forced colors

- **WHEN** `forced-colors: active` and a user views the hero
- **THEN** the `.glow-tag` pill (when shipped via USMR 5.1i) renders with a solid `ButtonFace` background, `ButtonText` foreground, and a `Highlight` border in place of the conic gradient

### Requirement: Live Region Announcement Coverage

Components that swap content via `aria-live` SHALL be exercised by an automated test that verifies the live-region content actually changes after a user-driven event (Tab / Enter / Click). The test serves as a proxy for screen-reader announcement firing.

#### Scenario: Stage focus updates decision card text

- **WHEN** `tests/screen-reader.spec.ts` runs `await page.keyboard.press("Tab")` until the first stage row is focused, then asserts the decision-claim element's text within 500 ms
- **THEN** the text content matches the focused stage's pass claim string from `STAGES` (proves the live region is wired and updating)

### Requirement: Automated WCAG Gate

The CI `accessibility` job SHALL run `axe-core` against `/` on chromium, webkit, and Mobile Safari, asserting zero violations against tags `wcag2a / wcag2aa / wcag21a / wcag21aa`. The gate SHALL be mandatory (no `continue-on-error`, no env-var skip).

#### Scenario: PR introduces a missing button label

- **WHEN** a contributor pushes a commit that adds an unlabeled `<button>` to `/`
- **THEN** the `accessibility` job fails the PR check with the axe-core `button-name` violation, citing the offending selector

#### Scenario: Per-engine coverage

- **WHEN** the `accessibility` job runs
- **THEN** it executes against `--project=chromium --project=webkit --project="Mobile Safari"` to catch focus-visible / forced-colors divergences specific to non-chromium engines

### Requirement: Reduced Motion Compliance

Animations longer than 200 ms or that move content vertically more than 5 px SHALL be disabled when the user agent reports `prefers-reduced-motion: reduce`. CSS `@media (prefers-reduced-motion: reduce)` blocks SHALL set `animation: none` and `transition: none` on the affected selectors.

#### Scenario: Glow-tag stops breathing under reduced-motion

- **WHEN** `prefers-reduced-motion: reduce` is active
- **THEN** the hero `.glow-tag` `glow-breathe` animation does not run; the pill renders in a static "mid-cycle" state with no box-shadow oscillation
