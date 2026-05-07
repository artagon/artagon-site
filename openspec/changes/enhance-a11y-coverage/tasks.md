## 0. Pre-flight

- [ ] 0.1 Run `npx openspec validate --strict enhance-a11y-coverage` and confirm zero errors. Files touched: none. Acceptance: command exits 0.
- [ ] 0.2 Confirm `@axe-core/playwright` is in `devDependencies` of `package.json` (already shipped on the branch alongside this proposal). If absent, `npm install --save-dev @axe-core/playwright`. Acceptance: `node_modules/@axe-core/playwright/dist/index.js` exists.
- [ ] 0.3 Add `culori` (~12 KB, MIT) to `devDependencies` for OKLCH→sRGB→relative-luminance conversion in the contrast vitest. Files touched: `package.json`, `package-lock.json`. Acceptance: `npm run test:vitest` continues to pass with the dep installed (no behavioural change yet).

## 1. Touch tap-toggle on TrustChainIsland (gap 1)

- [x] 1.1 `pressedIdx: number | null` state shipped in `src/components/TrustChainIsland.tsx`. Clicking a stage row toggles it (same idx → null; different idx → that idx). Hovered state remains independent.
- [x] 1.2 Decision-claim priority: `pressed > hovered > scenario.finalClaim` (via `focusedIdx = pressedIdx ?? hovered`). `aria-pressed` reflects `pressedIdx === i`. Pressed-state CSS marker `.trust-chain__stage.is-pressed` ships in `TrustChainIsland.css`.
- [ ] 1.3 Update `tests/home.spec.ts` "TrustChainIsland interactivity (desktop / mouse)" describe block — REMOVE the `test.skip(({isMobile}) => isMobile, ...)` from the click test (clicks now work on touch). KEEP the skip on the hover test (still mouse-only). Files touched: `tests/home.spec.ts`. Acceptance: click test passes on chromium, webkit, Mobile Chrome × 3, Mobile Safari × 2, Tablet × 3.
- [ ] 1.4 Add a new "TrustChainIsland tap-toggle (touch + mouse)" describe block to `tests/home.spec.ts`. Cases: tap stage 0 → assert `aria-pressed="true"`, decision-claim text matches `STAGES[0].pass`; tap stage 0 again → `aria-pressed="false"`, claim restores to `scenario.finalClaim`; tap stage 0 then stage 2 → stage 0 becomes `aria-pressed="false"`, stage 2 becomes `aria-pressed="true"`. Acceptance: all 3 sub-cases pass on every project (skip-list = empty).
- [ ] 1.5 Regenerate `home-hero-*` visual snapshot baselines if the `aria-pressed` attribute introduces a layout shift (it should not, but verify). Files touched: `tests/styling-snapshots.spec.ts-snapshots/*.png` via workflow_dispatch.

## 2. Tap-target floor (gap 2)

- [x] 2.1 Scenario-picker dot now exposes a 44 × 44 hit area on the `<button>` while the visible 9 × 9 dot renders via `::before`. Final shape: `width/height: 44px; padding: 0; display: grid; place-items: center;` on the button + `content: ""` pseudo-element for the dot. `.trust-chain__scenarios` gap collapsed to 0 (the button bounding boxes already give visual spacing).
- [ ] 2.2 Add a Playwright assertion in `tests/home.spec.ts` that the scenario-picker `<button>`'s `getBoundingClientRect()` has both width and height ≥ 44 CSS px. Acceptance: assertion passes on every project.
- [ ] 2.3 Verify visual snapshot of the picker strip — wider hit area shouldn't visually affect the dot rendering. Regenerate if necessary.

## 3. Color contrast audit (gap 3)

- [ ] 3.1 Add `tests/contrast-tokens.test.mts` (vitest). Imports `culori`, parses `public/assets/theme.css` for `:root { --token: oklch(...); }` declarations, computes contrast ratio for every text-tier and non-text-tier combination, asserts ≥ 4.5:1 for text and ≥ 3:1 for non-text. The test file documents the matrix in a top-of-file comment. Files touched: `tests/contrast-tokens.test.mts`.
- [ ] 3.2 If any existing token pair fails: adjust the failing token's lightness (preserve hue and chroma) to clear the threshold. Files touched: `public/assets/theme.css`. Acceptance: vitest passes.
- [ ] 3.3 Update `DESIGN.md` §"Color tokens" — augment the existing table with a `Contrast vs --bg` and `Contrast vs --bg-alt` column (and any other relevant background tokens) showing the computed ratio + AA pass status. Files touched: `DESIGN.md`. Acceptance: `npm run lint:design` passes; `check:design-drift` shows the table rows are within the existing allow-list.

## 4. Automated WCAG gate (gap 4)

- [x] 4.1 `test.skip(!runAxe, ...)` removed from `tests/home-axe.spec.ts` (USMR Phase 5.1p.8). `AXE_AUDIT=1` opt-in dropped. Engine-parity skip retained for firefox / mobile chrome / tablet / TV / 4K.
- [ ] 4.2 Update `.github/workflows/playwright.yml` `accessibility` job: ensure it covers `tests/home-axe.spec.ts` automatically (the job already runs `npx playwright test --grep "accessibility" --project=chromium --project=webkit --project="Mobile Safari"`; verify the spec's describe text contains "accessibility" or extend the grep). Files touched: `.github/workflows/playwright.yml`. Acceptance: workflow_dispatch run hits the axe gate without env-var setup.
- [ ] 4.3 Run the gate locally on chromium / webkit / Mobile Safari and confirm zero violations. If any persist after Phases 1-3, fix or document with a per-rule disable + `Reason:` inline comment in the spec.

## 5. Forced-colors mode (gap 5)

- [x] 5.1 `@media (forced-colors: active)` block in `public/assets/theme.css` maps `--bg/--bg-1/--bg-2 → Canvas`, `--fg* → CanvasText`, `--accent/--ok → Highlight`, `--bad/--warn → Mark`, `--line/--line-soft → CanvasText`, `--card-bg/--card-stroke` accordingly. All keyframes paused; decorative `box-shadow` cleared on `.glow-tag`, `.trust-chain`, `.btn`, footer cols, and writing-strip links.
- [x] 5.2 `@media (forced-colors: active)` block in `src/components/TrustChainIsland.css` overrides: pass border = `Highlight`, fail border = `Mark`, evaluating border = `Highlight`, pressed-state shadow cleared, `chain-spinner` border-top = `Highlight`. `.trust-chain` + `.trust-chain__decision` background = `Canvas`.
- [ ] 5.3 Add `tests/forced-colors.spec.ts` (Playwright). Set `forcedColors: 'active'` via the `use` config or `page.emulateMedia({ forcedColors: 'active' })`. Capture a fullPage snapshot at chromium-linux desktop resolution; assert via visual snapshot or per-element `getComputedStyle` that pass-state borders resolve to a system color. Files touched: `tests/forced-colors.spec.ts`. Acceptance: snapshot matches; assertions pass.
- [x] 5.4 DESIGN.md §11.7 "Forced colors mode" added with the full system-color mapping table.

## 6. Screen-reader announcement coverage (gap 6)

- [ ] 6.1 Add `tests/screen-reader.spec.ts`. Test cases: (a) on chromium/webkit/Mobile Safari, navigate via `page.keyboard.press("Tab")` until `#trust-chain-passkey` is focused; assert `.trust-chain__decision-claim` text content matches `STAGES[0].pass` within 500 ms; (b) press `Enter` to "press" the row (per Phase 1's tap-toggle); assert text PERSISTS across a subsequent blur (proves pressed state held by `aria-pressed`); (c) press `Tab` to next element, then `Enter` again to release pressed state; assert text reverts to `scenario.finalClaim`. Files touched: `tests/screen-reader.spec.ts`. Acceptance: 3 cases pass on each engine.
- [ ] 6.2 Document the test's coverage limits in its top-of-file docstring: this is a proxy for "live region updates fired", NOT actual SR announcement. Manual NVDA / JAWS / VoiceOver QA is tracked separately.

## 7. Focus indicators (gap 7)

- [x] 7.1 `:focus-visible` rules added to `src/components/TrustChainIsland.css` for `.trust-chain__stage` and `.trust-chain__decision` (2 px `var(--accent)` outline + 2 px offset). Scenario-picker dots already had focus-visible at 6 px radius.
- [x] 7.2 Site-wide focus-visible rule in `public/assets/theme.css` covers every `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`, `<summary>`, and `[tabindex]:not([tabindex="-1"])` — supersedes the per-page scoped rules originally planned for `src/pages/index.astro`. Forced-colors variant swaps outline to `Highlight`.
- [x] 7.3 Tokens audited — focus rules use `var(--accent)` directly (no separate `--focus-ring-*` tokens needed; `--accent` is already the semantic source-of-truth and re-tones via `[data-accent="*"]`).
- [ ] 7.4 Add a Playwright case in `tests/home.spec.ts` "a11y contract" describe: navigate via `page.keyboard.press("Tab")` until the on-ramp primary CTA is focused; assert via `page.evaluate` that `getComputedStyle(el).outlineWidth` ≥ 2 px and `outlineColor` resolves to a non-transparent value. Acceptance: passes on every project.

## 8. DESIGN.md alignment

- [x] 8.1 DESIGN.md §11 Accessibility extended with §11.6 (tap targets), §11.7 (forced colors), §11.8 (touch tap-toggle), §11.9 (focus indicators), §11.10 (automated CI gate). Existing §11.1-§11.5 left intact. The new section is keyed off the same `--accent` / `--ok` / `--bad` token chain as the implementation; lint:design + check:oklch-hex-parity remain green.
- [ ] 8.2 Run `npm run lint:design` and `npm run check:design-drift` to confirm the new section doesn't break the existing design-md format gate. Acceptance: both commands exit 0.
- [ ] 8.3 Update `docs/design-md.md` to mention the new §"Accessibility" section in the precedence chain.

## 9. Wrap-up

- [ ] 9.1 Re-run all CI gates locally: `rtk npm run build && rtk npm run postbuild && rtk npm run test:vitest && rtk npx playwright test`. Acceptance: all green.
- [ ] 9.2 Run `npx openspec validate --strict enhance-a11y-coverage` and confirm zero errors.
- [ ] 9.3 Open the PR; verify the `accessibility` CI job runs axe-core mandatorily on chromium / webkit / Mobile Safari.
- [ ] 9.4 After PR merges, archive via `/opsx:archive enhance-a11y-coverage`.
