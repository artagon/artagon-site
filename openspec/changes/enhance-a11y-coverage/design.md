## Context

USMR Phase 5.1 shipped the home-page content scaffolding (hero, on-ramp, pillars, writing strip, trust-chain island) with a strong-but-incomplete a11y posture. The 6-agent round-2 review surfaced seven WCAG 2.1 AA gaps that escape the existing structural assertions in `tests/home.spec.ts`:

1. **Touch UX gap** on the trust-chain island: `onMouseEnter` / `onMouseLeave` drive the hover-to-claim affordance. Touch devices synthesize `mouseenter` on tap then `mouseleave` on the next tap elsewhere, so a screen-reader user on iPad / iPhone tapping a stage row sees the claim flash and disappear with no sticky state. This is a customer-segment regression: an entire device class is locked out of the per-stage detail.
2. **Tap-target floor**: `.trust-chain__scenario-dot` is `width: 0.5625rem; height: 0.5625rem` (9 px). WCAG 2.5.5 requires ≥ 44 × 44 CSS px. A user with motor impairment cannot reliably hit a 9 px target.
3. **Contrast verification**: theme.css ships `--ok = oklch(0.80 0.15 155)` (green) and `--bad = oklch(0.66 0.18 25)` (red) on `--bg-alt = oklch(0.17 0.008 260)` (deep blue-gray). The contrast ratios are not computed or documented; some token pairs may fall below WCAG AA 4.5:1 (text) or 3:1 (non-text). The home-axe.spec.ts run on the round-2 audit flagged real `color-contrast` violations.
4. **No CI a11y scanner**: `tests/home.spec.ts` asserts the contract (tabindex / role / aria-\* attributes are present); it does NOT scan for color-contrast, ARIA validity, region/landmark coverage, or unlabeled controls. A regression that introduces a button without an accessible name ships green.
5. **Forced-colors mode**: Windows High Contrast / OS-level high-contrast modes activate `@media (forced-colors: active)`. The trust-chain CSS uses `color-mix()` and `box-shadow` glows that are forced-colors-discarded; the chain becomes invisible. DESIGN.md §7 mentions forced-colors testing as a contract; current implementation has zero overrides.
6. **Screen-reader announcement coverage**: `aria-live="polite"` on the decision card is wired in markup but never verified that an actual SR announces the swap. The proxy assertion (decision-claim text changes after a Tab/Enter) is the smallest gate that catches a regression where a future refactor silently drops `aria-live`.
7. **Focus indicators**: scenario-picker dots have `:focus-visible { outline: 2px solid var(--brand-teal); }`. Stage rows, decision card, on-ramp CTAs, and writing-strip cards do NOT — they fall back to browser-default focus rings, which can be invisible against tinted backgrounds (`var(--bg-alt)` blue-gray vs. Chrome's default thin black ring).

The seven gaps are independent enough to ship as 7 phased commits, each with its own test coverage and DESIGN.md alignment.

## Goals / Non-Goals

**Goals:**

- Close all 7 WCAG 2.1 AA gaps surfaced by the round-2 review.
- Codify the a11y contracts in DESIGN.md §"Accessibility" so they are durable across future visual changes.
- Promote `tests/home-axe.spec.ts` from `AXE_AUDIT=1`-gated to mandatory in CI.
- Add forced-colors and screen-reader-announcement coverage that catches regressions before merge.
- Document computed contrast ratios for every token pair in DESIGN.md's color-token table.

**Non-Goals:**

- Manual testing on real assistive tech (NVDA / JAWS / VoiceOver) — that's a separate manual-QA change with its own cadence and stakeholder review.
- WCAG 2.1 AAA-tier rules — overshooting the floor is not the goal; we want a defensible AA gate first.
- Full pa11y / Lighthouse-a11y CI integration — axe-core covers the same WCAG ruleset and is already a dev dep on this branch.
- Replacing the React island with a non-island implementation to side-step hydration-window issues — out of scope, tracked separately.
- Adding the axe `best-practice` and `experimental` rulesets — keep the gate enforceable; only the 4 WCAG tags (`wcag2a / wcag2aa / wcag21a / wcag21aa`).

## Decisions

### 1. New capability `site-accessibility` rather than extending `style-system`

`style-system` owns visual tokens and layout primitives. A11y rules are cross-cutting behavioural guarantees that span content, navigation, components, and interaction patterns — not styling primitives. A separate capability lets future a11y-relevant decisions (e.g., motion-tolerance gates, captions, alt-text rules) land in one canonical spec without bloating `style-system`.

**Alternative considered**: extend `style-system` with an "Accessibility" subsection. Rejected because it conflates token vocabulary with component contracts and would force a `style-system` rev whenever a non-styling a11y rule changes.

### 2. Tap-target compliance via invisible padding, NOT visual size increase

DESIGN.md §6.5 specifies the scenario-picker dots as 9 px solid for visual fidelity (small "scrubber" indicators). Increasing the visible size breaks the design contract. Instead, wrap the visible 9 px dot in a `::before` pseudo-element (or an outer `<button>` with transparent padding) that extends the hit area to 44 × 44 CSS px without affecting layout. This is the standard touch-target pattern (CSS Tricks, MDN) and matches Apple's HIG recommendation for compact controls.

**Alternative considered**: increase visible dot to 12 × 12 px and use `padding` for the rest. Rejected because 12 px is still below 44 px and would also drift from DESIGN.md §6.5.

### 3. Touch tap-toggle via `aria-pressed`, NOT `onPointerDown` simulation

For the trust-chain stage rows, instead of trying to make `onMouseEnter` work on touch (it doesn't, by design), introduce a tap-toggle: `onClick` toggles a `pressed` state, the decision card shows the pressed stage's claim until a different stage is pressed (or the same stage is pressed again to release). Mouse users still get hover-to-claim. Pressed state expressed via `aria-pressed="true|false"` on the row; SR users hear "Passkey button, pressed" instead of guessing from the live-region swap alone.

**Alternative considered**: replicate hover via long-press. Rejected because long-press conflicts with native iOS / Android context-menu gestures and isn't a standard a11y pattern.

### 4. Color-contrast verification at vitest time, NOT at runtime

A vitest unit test (`tests/contrast-tokens.test.mts`) loads `public/assets/theme.css`, parses every `--token: oklch(...)` declaration, and computes WCAG contrast ratios via a small `oklch-to-rgb` polyfill (or a dep like `culori`). Failing pairs throw at vitest time, surfacing the violation in PR before any styling work hits production. This is a faster + more deterministic gate than running axe-core's color-contrast rule which only catches what's actually rendered on `/`.

**Alternative considered**: rely on axe-core's `color-contrast` rule alone. Rejected because axe only sees rendered DOM — token pairs that are defined but not yet consumed (e.g., `--warn` on `--bg-alt`) ship un-audited until they appear on a page.

**Dependency choice**: `culori` (~12 KB, MIT, mature OKLCH support) over hand-rolled. Adding one dev-dep is acceptable for the test-time-only use.

### 5. Forced-colors overrides via DESIGN.md token aliases, NOT hand-tuned per-component CSS

`@media (forced-colors: active)` overrides should ALL key off semantic system colors (`Canvas`, `CanvasText`, `LinkText`, `ButtonFace`, `ButtonText`, `Highlight`, `HighlightText`, `Mark`). DESIGN.md §"Accessibility / Forced colors" defines the mapping `--bg → Canvas`, `--text → CanvasText`, `--accent → Highlight`, `--bad → Mark` etc. Components reference the alias, not the system color directly, so the mapping is one place.

**Alternative considered**: per-component hand-tuned `@media (forced-colors: active)` blocks. Rejected because it's lossy + drifts; one component will eventually use a different system color than another for the same role.

### 6. Screen-reader announcement test via Playwright + decision-claim DOM polling

A real SR-announcement assertion would require driving NVDA / VoiceOver from CI — out of scope. The proxy is: assert the decision-claim element's text content changes within 500 ms of a Tab + Enter on a stage row. If `aria-live="polite"` is wired correctly, the live-region update will fire whenever text changes. Test failure means either the live region is gone or the text isn't updating — both real regressions.

**Limitation**: this catches "live region didn't update" regressions but NOT "live region exists but SR doesn't announce" issues. Manual SR testing remains the gate for that.

### 7. CI gate flip from `AXE_AUDIT=1`-gated to mandatory

Phase 4 of this change is the CI gate flip: drop the `test.skip(!runAxe, ...)` from `tests/home-axe.spec.ts` and remove the `AXE_AUDIT=1` env var from CI invocation. By that point, all violations from Phases 1-3 should be cleared. If any persist, fix-or-disable-with-reason; do not soft-disable the gate.

## Risks / Trade-offs

- **Risk**: The contrast audit may surface that an existing token pair shipped in 47f9898 (`--ok` over `--bg-alt`) is below 4.5:1, requiring a token shift or component restyling. → **Mitigation**: do the contrast audit (Phase 3) BEFORE the CI gate flip (Phase 4); if a token pair fails, adjust the token's lightness and regenerate visual snapshot baselines as part of the same commit.
- **Risk**: Forced-colors overrides may break visual snapshot tests if the test runner inadvertently runs in forced-colors mode. → **Mitigation**: confirm Playwright's chromium project does NOT enable `forced-colors: active` by default; add an explicit `forcedColors: 'none'` to the project use config if needed.
- **Risk**: The tap-toggle (Phase 1) changes the trust-chain UX semantics — a tap on a stage row is now a sticky press, not a transient hover. Existing visual snapshot baselines (which capture the `scenarioIdx=0, hovered=null` state) may shift. → **Mitigation**: regenerate baselines as part of Phase 1; the change is intentional and documented in DESIGN.md §6.5.
- **Risk**: `culori` dev-dep ships fresh. → **Mitigation**: trade-off is acceptable; alternative is hand-rolled OKLCH→sRGB→relative-luminance conversion which is non-trivial and would re-implement what culori already does correctly.
- **Trade-off**: 7 phased commits = 7 force-pushes worth of CI cycles vs. one big atomic commit. → **Choice**: phased. The independent verifiability is worth the CI cost.

## Migration Plan

No migration required — these are additions or strengthenings of existing contracts. The CI gate flip in Phase 4 is the only step that could fail existing PRs that introduce new violations; deploy after all 7 phases land on `main` so the gate flip cannot block this very PR.

## Open Questions

- Should the `culori` dev-dep also feed `lint:tokens` (currently regex-based)? → defer; out of scope.
- Should DESIGN.md's color-token contrast annotations be auto-regenerated by a script? → defer to a follow-up `automate-design-md-contrast-table` change once the manual table proves stable.
- Should the screen-reader announcement test eventually run real NVDA via the Microsoft a11y-driver tooling? → tracked as a future research spike, not in scope here.
