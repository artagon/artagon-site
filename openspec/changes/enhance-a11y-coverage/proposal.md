## Why

The round-2 sub-agent review of USMR Phase 5.1 surfaced seven discrete WCAG 2.1 AA gaps on `/`. The shipped a11y posture is BETTER than typical (semantic HTML, comprehensive ARIA on the React island, keyboard parity, prefers-reduced-motion respected) but is NOT comprehensive: a screen-reader user on a tablet hits a touch-only dead-end, a low-vision user with motor impairment can't reliably tap the 9 px scenario-picker dots, and there is no automated WCAG scanner in CI. For a product whose tagline is "Trusted Identity for Machines and Humans," accessibility is a customer commitment — and the current implementation regression surface is wider than the existing structural assertions in `tests/home.spec.ts` cover.

## What Changes

- Touch-device tap-toggle on `TrustChainIsland` stage rows so screen-reader users on tablets / phones can navigate per-stage detail (current hover-only path is a touch-class regression).
- Tap-target sizing: scenario-picker dots gain a 44×44 px invisible hit area to meet WCAG 2.5.5 (visible 9 px dot retained for design fidelity).
- Color-contrast audit: every `--ok / --bad / --warn / --muted / --text` × `--bg / --bg-alt / --bg-1` combination verified against WCAG AA (4.5:1 text, 3:1 non-text); ratios documented in `DESIGN.md`'s color-token table.
- Automated WCAG 2.1 AA gate: flip `tests/home-axe.spec.ts` from `AXE_AUDIT=1`-gated to mandatory in `.github/workflows/playwright.yml`'s `accessibility` job once violations clear.
- Forced-colors mode: `@media (forced-colors: active)` overrides on `TrustChainIsland.css`, hero scoped styles in `index.astro`, and `public/assets/theme.css` per DESIGN.md §7.
- Screen-reader announcement coverage: a Playwright spec that drives Tab navigation through trust-chain stages and asserts decision-card text changes after Tab/Enter (proxy for `aria-live="polite"` announcement firing).
- Explicit `:focus-visible` indicators on stage rows, decision card, on-ramp CTAs, and writing-strip cards (currently relying on browser defaults that can render invisible against tinted backgrounds).
- DESIGN.md gains a §"Accessibility" section codifying the contracts (tap-target minimum, contrast ratios, focus-indicator spec, reduced-motion handling, forced-colors handling) so the rules are durable across future visual changes.

## Capabilities

### New Capabilities

- `site-accessibility`: Single source of truth for the project's WCAG 2.1 AA contracts — tap-target minimum, contrast-ratio floor, focus-indicator spec, reduced-motion + forced-colors handling, screen-reader announcement guarantees, and the automated CI gate that enforces them. Distinct from `style-system` (which owns visual tokens and layout primitives) because a11y rules are cross-cutting behavioural guarantees, not styling primitives.

### Modified Capabilities

- `style-system`: §"Color tokens" gains computed contrast ratios for every `--ok / --bad / --warn / --muted / --text` × `--bg / --bg-alt / --bg-1` combination. §"Focus indicators" requirement added (every interactive element MUST have a visible `:focus-visible` outline ≥ 2 px against `--accent` with 2 px offset, no reliance on browser defaults). Reference `openspec/specs/style-system/spec.md` for the existing surface.
- `site-content`: §"Interactive components" requirement added — every interactive component on a content route MUST expose both pointer and keyboard interaction paths with parity, and MUST meet the tap-target minimum from `site-accessibility`. Reference `openspec/specs/site-content/spec.md`.

## Impact

- **Code**: `src/components/TrustChainIsland.tsx` (touch tap-toggle), `src/components/TrustChainIsland.css` (focus styles, forced-colors block, hit-area padding), `src/pages/index.astro` (focus styles on on-ramp CTAs and writing-strip cards), `public/assets/theme.css` (focus-ring token + forced-colors fallbacks).
- **Specs**: new `openspec/specs/site-accessibility/spec.md`; deltas to `style-system` and `site-content`.
- **Tests**: `tests/home-axe.spec.ts` (existing — flips from gated to mandatory), new `tests/screen-reader.spec.ts` for announcement-firing coverage, new `tests/forced-colors.spec.ts` for high-contrast rendering, new `tests/contrast-tokens.test.mts` (vitest) for token-pair contrast assertions.
- **CI**: `.github/workflows/playwright.yml` `accessibility` job extended to invoke axe-core unconditionally; new step for forced-colors snapshot.
- **DESIGN.md**: new §"Accessibility" section + contrast-ratio annotations on the color-token table.
- **Dependencies**: `@axe-core/playwright` (already shipped in the current branch alongside this proposal).
- **Out of Scope**: full pa11y / Lighthouse-a11y CI integration (axe-core covers the same WCAG ruleset and we already have it wired); axe-core deeper rulesets (`best-practice`, `experimental`) — keep to `wcag2a / wcag2aa / wcag21a / wcag21aa` so the gate is enforceable; AAA-tier rules; live testing on real assistive tech (manual QA, separate change).
