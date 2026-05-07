## 0. Pre-flight

- [ ] 0.1 Run `npx openspec validate --strict enhance-a11y-coverage` and confirm zero errors. Files touched: none. Acceptance: command exits 0.
- [ ] 0.2 Confirm `@axe-core/playwright` is in `devDependencies` of `package.json` (already shipped on the branch alongside this proposal). If absent, `npm install --save-dev @axe-core/playwright`. Acceptance: `node_modules/@axe-core/playwright/dist/index.js` exists.
- [ ] 0.3 Add `culori` (~12 KB, MIT) to `devDependencies` for OKLCH→sRGB→relative-luminance conversion in the contrast vitest. Files touched: `package.json`, `package-lock.json`. Acceptance: `npm run test:vitest` continues to pass with the dep installed (no behavioural change yet).

## 1. Touch tap-toggle on TrustChainIsland (gap 1)

- [ ] 1.1 Add `pressedIdx: number | null` state to `src/components/TrustChainIsland.tsx`; clicking a stage row toggles it (same idx → null; different idx → that idx). Hovered state remains independent and continues to drive transient mouse-only swaps.
- [ ] 1.2 The decision card claim resolves in priority order: `pressed > hovered > scenario.finalClaim`. `aria-pressed` on each stage row reflects whether `pressedIdx === i`. Files touched: `src/components/TrustChainIsland.tsx`.
- [ ] 1.3 Update `tests/home.spec.ts` "TrustChainIsland interactivity (desktop / mouse)" describe block — REMOVE the `test.skip(({isMobile}) => isMobile, ...)` from the click test (clicks now work on touch). KEEP the skip on the hover test (still mouse-only). Files touched: `tests/home.spec.ts`. Acceptance: click test passes on chromium, webkit, Mobile Chrome × 3, Mobile Safari × 2, Tablet × 3.
- [ ] 1.4 Add a new "TrustChainIsland tap-toggle (touch + mouse)" describe block to `tests/home.spec.ts`. Cases: tap stage 0 → assert `aria-pressed="true"`, decision-claim text matches `STAGES[0].pass`; tap stage 0 again → `aria-pressed="false"`, claim restores to `scenario.finalClaim`; tap stage 0 then stage 2 → stage 0 becomes `aria-pressed="false"`, stage 2 becomes `aria-pressed="true"`. Acceptance: all 3 sub-cases pass on every project (skip-list = empty).
- [ ] 1.5 Regenerate `home-hero-*` visual snapshot baselines if the `aria-pressed` attribute introduces a layout shift (it should not, but verify). Files touched: `tests/styling-snapshots.spec.ts-snapshots/*.png` via workflow_dispatch.

## 2. Tap-target floor (gap 2)

- [ ] 2.1 Wrap the visible 9 px scenario-picker dot in a 44 × 44 hit area. Implementation: outer `<button>` element with `padding: 0.875rem` (≈ 14 px each side → 9 + 28 = 37 px… add ≥ 17 px to reach 44; use `padding: 1.0625rem` = 17 px for 9 + 34 = 43 → bump to `1.1rem`). Inner `<span class="trust-chain__scenario-dot">` is the visible target. Files touched: `src/components/TrustChainIsland.tsx` (markup change), `src/components/TrustChainIsland.css` (adjust `.trust-chain__scenarios` gap to absorb the larger tap area).
- [ ] 2.2 Add a Playwright assertion in `tests/home.spec.ts` that the scenario-picker `<button>`'s `getBoundingClientRect()` has both width and height ≥ 44 CSS px. Acceptance: assertion passes on every project.
- [ ] 2.3 Verify visual snapshot of the picker strip — wider hit area shouldn't visually affect the dot rendering. Regenerate if necessary.

## 3. Color contrast audit (gap 3)

- [ ] 3.1 Add `tests/contrast-tokens.test.mts` (vitest). Imports `culori`, parses `public/assets/theme.css` for `:root { --token: oklch(...); }` declarations, computes contrast ratio for every text-tier and non-text-tier combination, asserts ≥ 4.5:1 for text and ≥ 3:1 for non-text. The test file documents the matrix in a top-of-file comment. Files touched: `tests/contrast-tokens.test.mts`.
- [ ] 3.2 If any existing token pair fails: adjust the failing token's lightness (preserve hue and chroma) to clear the threshold. Files touched: `public/assets/theme.css`. Acceptance: vitest passes.
- [ ] 3.3 Update `DESIGN.md` §"Color tokens" — augment the existing table with a `Contrast vs --bg` and `Contrast vs --bg-alt` column (and any other relevant background tokens) showing the computed ratio + AA pass status. Files touched: `DESIGN.md`. Acceptance: `npm run lint:design` passes; `check:design-drift` shows the table rows are within the existing allow-list.

## 4. Automated WCAG gate (gap 4)

- [ ] 4.1 Drop the `test.skip(!runAxe, ...)` from `tests/home-axe.spec.ts`. Remove the `AXE_AUDIT=1` env-var pattern. The remaining `test.skip` for non-allowed projects (firefox / mobile chrome / tablet / TV / 4K) STAYS — axe-core only runs on chromium / webkit / Mobile Safari for engine-parity coverage. Files touched: `tests/home-axe.spec.ts`.
- [ ] 4.2 Update `.github/workflows/playwright.yml` `accessibility` job: ensure it covers `tests/home-axe.spec.ts` automatically (the job already runs `npx playwright test --grep "accessibility" --project=chromium --project=webkit --project="Mobile Safari"`; verify the spec's describe text contains "accessibility" or extend the grep). Files touched: `.github/workflows/playwright.yml`. Acceptance: workflow_dispatch run hits the axe gate without env-var setup.
- [ ] 4.3 Run the gate locally on chromium / webkit / Mobile Safari and confirm zero violations. If any persist after Phases 1-3, fix or document with a per-rule disable + `Reason:` inline comment in the spec.

## 5. Forced-colors mode (gap 5)

- [ ] 5.1 Add a `@media (forced-colors: active)` block to `public/assets/theme.css` that maps the project's semantic aliases to system colors: `--bg → Canvas`, `--text → CanvasText`, `--accent → Highlight`, `--ok → Highlight` (or a green-channel system color where available), `--bad → Mark`, `--warn → Mark`. Files touched: `public/assets/theme.css`.
- [ ] 5.2 Update `src/components/TrustChainIsland.css` to add `@media (forced-colors: active)` block: `.trust-chain__stage.is-pass { border-color: Highlight; }`, `.trust-chain__stage.is-fail { border-color: Mark; }`, suppress all `box-shadow` (forced colors discard them anyway, but explicit is clearer), set `background: Canvas` on the card. Files touched: `src/components/TrustChainIsland.css`.
- [ ] 5.3 Add `tests/forced-colors.spec.ts` (Playwright). Set `forcedColors: 'active'` via the `use` config or `page.emulateMedia({ forcedColors: 'active' })`. Capture a fullPage snapshot at chromium-linux desktop resolution; assert via visual snapshot or per-element `getComputedStyle` that pass-state borders resolve to a system color. Files touched: `tests/forced-colors.spec.ts`. Acceptance: snapshot matches; assertions pass.
- [ ] 5.4 Update `DESIGN.md` to add a §"Accessibility / Forced colors" subsection citing the system-color mapping.

## 6. Screen-reader announcement coverage (gap 6)

- [ ] 6.1 Add `tests/screen-reader.spec.ts`. Test cases: (a) on chromium/webkit/Mobile Safari, navigate via `page.keyboard.press("Tab")` until `#trust-chain-passkey` is focused; assert `.trust-chain__decision-claim` text content matches `STAGES[0].pass` within 500 ms; (b) press `Enter` to "press" the row (per Phase 1's tap-toggle); assert text PERSISTS across a subsequent blur (proves pressed state held by `aria-pressed`); (c) press `Tab` to next element, then `Enter` again to release pressed state; assert text reverts to `scenario.finalClaim`. Files touched: `tests/screen-reader.spec.ts`. Acceptance: 3 cases pass on each engine.
- [ ] 6.2 Document the test's coverage limits in its top-of-file docstring: this is a proxy for "live region updates fired", NOT actual SR announcement. Manual NVDA / JAWS / VoiceOver QA is tracked separately.

## 7. Focus indicators (gap 7)

- [ ] 7.1 Add `:focus-visible` rules in `src/components/TrustChainIsland.css`: `.trust-chain__stage:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`. Same rule for `.trust-chain__decision:focus-visible` (it gains a programmatic focus path via Phase 6's keyboard test). Files touched: `src/components/TrustChainIsland.css`.
- [ ] 7.2 Add `:focus-visible` rules in `src/pages/index.astro` scoped `<style>` block for `.onramp .btn`, `.onramp .btn.primary`, `.writing-strip__link`, `.writing-strip__more`. Files touched: `src/pages/index.astro`.
- [ ] 7.3 Audit `public/assets/theme.css` `--focus-ring-*` tokens; confirm the focus rules above resolve via the existing token chain (`--focus-ring-color`, `--focus-ring-width`, etc.). If gaps, add the missing token. Files touched: `public/assets/theme.css`.
- [ ] 7.4 Add a Playwright case in `tests/home.spec.ts` "a11y contract" describe: navigate via `page.keyboard.press("Tab")` until the on-ramp primary CTA is focused; assert via `page.evaluate` that `getComputedStyle(el).outlineWidth` ≥ 2 px and `outlineColor` resolves to a non-transparent value. Acceptance: passes on every project.

## 8. DESIGN.md alignment

- [ ] 8.1 Add a new top-level §"Accessibility" section to `DESIGN.md` summarising the contracts: tap-target minimum (44 × 44 CSS px), contrast ratios (4.5:1 text, 3:1 non-text), focus-indicator spec (2 px `var(--accent)` outline + 2 px offset), reduced-motion handling (prefers-reduced-motion: reduce → animation: none), forced-colors handling (system-color mapping), screen-reader announcement contract (aria-live="polite" verified by `tests/screen-reader.spec.ts`). Files touched: `DESIGN.md`.
- [ ] 8.2 Run `npm run lint:design` and `npm run check:design-drift` to confirm the new section doesn't break the existing design-md format gate. Acceptance: both commands exit 0.
- [ ] 8.3 Update `docs/design-md.md` to mention the new §"Accessibility" section in the precedence chain.

## 9. Wrap-up

- [ ] 9.1 Re-run all CI gates locally: `rtk npm run build && rtk npm run postbuild && rtk npm run test:vitest && rtk npx playwright test`. Acceptance: all green.
- [ ] 9.2 Run `npx openspec validate --strict enhance-a11y-coverage` and confirm zero errors.
- [ ] 9.3 Open the PR; verify the `accessibility` CI job runs axe-core mandatorily on chromium / webkit / Mobile Safari.
- [ ] 9.4 After PR merges, archive via `/opsx:archive enhance-a11y-coverage`.
