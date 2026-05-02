# Accessibility Review — update-site-marketing-redesign

Dimension: Accessibility only. Confidence floor: 80% (WCAG 2.2 AA gaps).

### [High] Trust-chain tooltip primitive has zero spec coverage
**Location**: `specs/site-mobile-layout/spec.md` (no requirement); `tasks.md:87` mentions `TrustChainTooltip.astro` only.
DESIGN.md §4.13 is the most a11y-dense primitive — `role="dialog"` + `aria-modal="false"`, `aria-describedby` rows, Esc-dismiss, redundant `ⓘ` button as the only operable affordance for switch/keyboard users, reduced-motion opacity-only at 80 ms. None encoded as SHALL. A task without a requirement is not a testable gate.
**Fix**: Add to site-mobile-layout:
> `TrustChainTooltip` MUST render as `role="dialog"` `aria-modal="false"`, MUST be Esc-dismissable page-wide, MUST be operable by keyboard alone (Enter/Space toggle on `tabindex="0"` row plus discoverable `<button aria-label="Explain {stage}">`), and MUST NOT rely on hover as sole trigger. Under `prefers-reduced-motion: reduce`, transitions MUST be opacity-only ≤ 80 ms. Rows MUST carry `aria-describedby` referencing the open tip.

### [High] Skip-link focus management is unspecified
**Location**: `specs/site-navigation/spec.md:17-29`.
Spec requires first-tabbable + `<main tabindex="-1">` but never says activation MUST move focus to `<main>`. Safari/Firefox leave focus on the link — WCAG 2.4.1 failure.
**Fix**:
> WHEN the user activates the skip link, THEN focus SHALL move to `<main id="main-content">` so the next Tab lands inside `<main>`; `lint:skip-link` MUST verify `document.activeElement === main` post-activation.

### [High] Standards-chip caption unreachable for keyboard-only desktop
**Location**: `specs/site-standards-registry/spec.md:17-29`.
Caption shown via desktop hover and `@media (hover: none)` only. Keyboard-only desktop users get neither — WCAG 1.4.13 and 2.1.1 failures.
**Fix**:
> Caption MUST be visible on `:hover` OR `:focus-visible`, AND visible by default under `@media (hover: none)`. Caption MUST be dismissable, hoverable, and persistent per WCAG 1.4.13.

### [Medium] Reduced-motion freeze-vs-disable for trust chain
**Location**: `design.md:121`; no requirement.
"All non-essential motion disabled" is silent on whether rotation freezes mid-cycle (semantically wrong) or pins to a complete scenario. DESIGN.md §7.4 says the latter.
**Fix**:
> Under `prefers-reduced-motion: reduce`, `TrustChain` cycling MUST stop on a complete PERMIT or DENY end-state (never mid-transition); `aria-live="polite"` updates MUST be suppressed.

### [Medium] PERMIT/DENY conveyed by color alone
**Location**: `style-system/spec.md` (no requirement); `design.md:119`.
`--ok`/`--bad`/`--warn` markers referenced; no requirement forces a non-color signal. WCAG 1.4.1 failure as drafted.
**Fix**:
> Decision outcomes (PERMIT, DENY, WARN) MUST be conveyed by at least one non-color channel (text label OR icon shape OR ARIA state) in addition to color, verified under `forced-colors: active`.

### [Medium] Forced-colors scope is bridge-only
**Location**: `specs/site-bridge-story/spec.md:31-34`.
DESIGN.md §4.12 treats forced-colors sitewide. Nav active-state, chip captions, and trust-chain markers use `backdrop-filter`/`box-shadow` that vanish in Windows High Contrast.
**Fix**: Add to site-navigation and site-mobile-layout:
> Under `forced-colors: active`, `aria-current="page"` indicator, chip outline, hamburger toggle outline, and trust-chain stage markers MUST remain visible using `CanvasText`/`Highlight` system colors; MUST NOT rely on `backdrop-filter` or `box-shadow` for state.

### [Medium] Icon-button & hamburger tap targets unspecified
**Location**: `specs/site-mobile-layout/spec.md:26-33` (only chips).
GitHub icon button is 34 px per DESIGN.md; hamburger, tooltip close, theme toggle have no floor. WCAG 2.5.8 risk.
**Fix**: Extend the tap-target requirement to enumerate "GitHub icon-button, hamburger toggle, tooltip close button, theme toggle" with Playwright ≥ 44×44 scenarios each.

### [Low] Theme toggle does not announce state
**Location**: `specs/site-navigation/spec.md:68-76`.
Two-state button with no `aria-pressed` or state-bearing accessible name — WCAG 4.1.2 risk.
**Fix**:
> Theme toggle MUST expose state via `aria-pressed` OR an accessible name reflecting the active theme; pre-paint script MUST set the attribute before first paint.

### [Low] Heading ladder unspecified for writing
**Location**: `specs/site-content/spec.md`; only "single h1" exists in site-mobile-layout.
DESIGN.md §4.12 requires h1→h2→h3 for writing.
**Fix**: "Writing detail routes MUST present headings in non-skipping order; `lint:meta` MUST flag any `h{n+2}` following `h{n}` without `h{n+1}`."

## Verdict

APPROVE-WITH-CHANGES — 6 must-fix items.
