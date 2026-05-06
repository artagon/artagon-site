## 0. Phase 0 — Pre-flight

- [ ] 0.1 Run `openspec validate --strict self-host-woff2-fonts`. Acceptance: validation reports valid.
- [ ] 0.2 Identify upstream sources for all 5 families (rsms/inter, undercase/fraunces, florianschulz/space-grotesk, is-foundation/instrument-serif, jetbrains/jetbrainsmono). Files: `public/assets/fonts/UPSTREAM` (PERMANENT — supply-chain provenance, NOT temporary). Acceptance: each family has a documented commit-SHA pin recorded in `public/assets/fonts/UPSTREAM` with format: `<family>: <upstream-repo>@<commit-sha> # <date>`. Per multi-reviewer-r1 finding [M-7].
- [ ] 0.3 Audit current `public/assets/theme.css` for any `font-family` declaration that does not resolve to a fallback chain (`system-ui` etc.). Files: `public/assets/theme.css`. Acceptance: no naked custom-family references; all use `, system-ui, sans-serif` (or analogous) chains.

## 1. Phase 1 — Source + subset WOFF2 binaries

- [ ] 1.1 Add dev dependency `subset-font` (or equivalent) via `npm install --save-dev subset-font@<exact>`. Files: `package.json`, `package-lock.json`. Acceptance: `npm ls subset-font` reports installed.
- [ ] 1.2 Download upstream WOFF or TTF for each family at the pinned commit. Files: temporary `tmp/upstream-fonts/`. Acceptance: 8-10 source binaries staged (Inter Tight 400/500/700; Space Grotesk 400/500/700; Fraunces 400-italic; Instrument Serif 400; JetBrains Mono 400).
- [ ] 1.3 Subset each binary to the declared `unicode-range` (Latin + Latin-Extended + numeric + ligatures + select symbols). Files: `public/assets/fonts/<family>/<weight>-<style>.woff2`. Acceptance: each WOFF2 < 60 KB.
- [ ] 1.4 Vendor the upstream `LICENSE.txt` per family. Files: `public/assets/fonts/<family>/LICENSE.txt`. Acceptance: each LICENSE.txt ≥ 1 KB; first 80 bytes contain "SIL Open Font License" or upstream license name.
- [ ] 1.5 Compute SHA-256 of each WOFF2; record in `public/assets/fonts/CHECKSUMS` as `<sha256>  <relative-path>` (one line each). Files: `public/assets/fonts/CHECKSUMS`. Acceptance: `sha256sum -c public/assets/fonts/CHECKSUMS` exits zero.
- [ ] 1.6 Delete `tmp/upstream-fonts/` (source binaries staging dir; subsetting is complete and staging copies are no longer needed). `public/assets/fonts/UPSTREAM` is PERMANENT and stays — supply-chain provenance for forensics. Files: `tmp/upstream-fonts/` removed. Acceptance: clean tree; `public/assets/fonts/UPSTREAM` present and tracked.

## 2. Phase 2 — `derive-font-metrics.mjs` + `verify-font-metrics.mjs`

- [ ] 2.1 Build `scripts/derive-font-metrics.mjs`: parse each WOFF2's `head` (unitsPerEm) + `OS/2` (sTypoAscender/Descender/LineGap, xAvgCharWidth) tables; compute size-adjust + ascent/descent/line-gap-override against system fallback. Output: TS-format object literal printed to stdout (with `--write` flag, also patches the `@font-face` block in `theme.css` in-place). Files: `scripts/derive-font-metrics.mjs`. Acceptance: running with no args prints the override values for all 5 families; `--write` flag idempotent on re-run.
- [ ] 2.2 Build `scripts/verify-font-metrics.mjs`: re-derives the same values + verifies SHA-256 + verifies LICENSE.txt presence/size + verifies cmap is subset of declared unicode-range. Exit 0 / 1 / 2 contract. Files: `scripts/verify-font-metrics.mjs`. Acceptance: against the Phase 1 WOFF2 set, gate exits 0; flipping any drift (e.g. truncate a license) flips to non-zero.
- [ ] 2.3 Add `node:test` tests for both: `tests/derive-font-metrics.test.mjs`, `tests/verify-font-metrics.test.mjs`. Use mkdtemp + a tiny pre-canned synthetic WOFF2 fixture. Files: 2 new test files + `tests/fixtures/synthetic.woff2`. Acceptance: ≥ 8 tests pass covering happy path + each violation type. (Flat `tests/` layout matches today's `tests/*.test.mjs` pattern; will migrate to `tests/unit/*.test.ts` when `modernize-unit-tests-with-vitest` archives.)
- [ ] 2.4 Add npm scripts: `derive:font-metrics` → `node scripts/derive-font-metrics.mjs`, `verify:font-metrics` → `node scripts/verify-font-metrics.mjs`. Files: `package.json`. Acceptance: both invocable; help text describes flags.

## 3. Phase 3 — `@font-face` declarations in theme.css

- [ ] 3.1 Add a new `## ===== TYPOGRAPHY =====` section to `public/assets/theme.css` containing 8-10 `@font-face` blocks (one per shipped face). Each block: `font-family`, `font-weight`, `font-style`, `font-display: swap`, `unicode-range: U+0020-007F, U+00A0-024F, ...`, `src: url('/assets/fonts/<family>/<weight>-<style>.woff2') format('woff2')`. Override values populated by Phase 2.1's `--write` mode. Files: `public/assets/theme.css`. Acceptance: every `@font-face` block has all required properties; no two blocks declare the same `font-family`+`font-weight`+`font-style` triple.
- [ ] 3.2 Update existing typography token chains in `theme.css` to reference the new families: `--font-display`, `--font-body`, `--font-mono`. Each token MUST keep its system-fallback chain intact (`Inter Tight, system-ui, ...`). Files: `public/assets/theme.css`. Acceptance: `npx astro build` succeeds; rendered HTML uses the new families when WOFF2s load.
- [ ] 3.3 Run `npm run derive:font-metrics --write` to populate the override values from real binaries. Files: `public/assets/theme.css`. Acceptance: every `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` is a numeric percentage; no placeholder values remain.

## 4. Phase 4 — Per-route preload links

- [ ] 4.1 Modify `src/layouts/BaseLayout.astro` to accept `Astro.props.preloadFont?: string` (default: `"space-grotesk-500"`). Emit one `<link rel="preload" as="font" type="font/woff2" crossorigin>` in `<head>`, resolving to `/assets/fonts/<family>/<weight>-<style>.woff2`. Files: `src/layouts/BaseLayout.astro`. Acceptance: built `dist/index.html` contains exactly one preload-link per route.
- [ ] 4.2 Audit each `src/pages/**/*.astro` route's BaseLayout invocation. Marketing routes use the default. Long-form `/writing/*` routes pass `preloadFont="fraunces-400-italic"`. Files: `src/pages/writing/[slug].astro` and any other long-form route. Acceptance: every route emits the right preload-link per its content type.
- [ ] 4.3 Add Playwright e2e test `tests/font-loading.spec.ts`: loads `/`, asserts `getComputedStyle(document.querySelector('h1')).fontFamily` resolves to "Space Grotesk" (or fallback if WOFF2 didn't load); asserts the preload-link element exists with the correct href + crossorigin attribute. Files: `tests/font-loading.spec.ts`. Acceptance: test passes on chromium + firefox + webkit. (Flat `tests/` layout; relocates to `tests/e2e/*.spec.ts` when `modernize-unit-tests-with-vitest` archives.)

## 5. Phase 5 — `measure-font-payload.mjs` + budget gate

- [ ] 5.1 Build `scripts/measure-font-payload.mjs`: walk `dist/**/*.html`, parse `<link rel="preload" as="font">` + transitively reach `@font-face` URIs via referenced stylesheets, sum bytes per route + per-family-per-route, exit non-zero if any route > 180 KB OR any family > 60 KB. Output: JSON line per route. Files: `scripts/measure-font-payload.mjs`. Acceptance: against current dist, exits 0 with summary; injecting a 200KB WOFF2 reference flips to non-zero.
- [ ] 5.2 Add `node:test` tests: `tests/measure-font-payload.test.mjs`. Synthetic dist/ fixtures via mkdtemp. Files: new test. Acceptance: ≥ 6 tests covering happy path + per-route violation + per-family violation + JSON output shape. (Flat `tests/` layout per modernize-unit-tests-with-vitest deferral note in proposal.md Prerequisites.)
- [ ] 5.3 Add npm script `measure:font-payload` → `node scripts/measure-font-payload.mjs`. Files: `package.json`. Acceptance: invocable.

## 6. Phase 6 — Wire gates into postbuild

- [ ] 6.1 Update `package.json` `postbuild` to: `verify:prerequisites && verify:design-prerequisites && lint:tokens && verify-font-self-hosting && verify:font-metrics && measure:font-payload && sri && csp && lint:design && lint:design-md-uniqueness`. Files: `package.json`. Acceptance: chain runs in order; both new gates execute every postbuild.
- [ ] 6.2 Update `tests/README.md` documenting the new test files. Files: `tests/README.md`. Acceptance: README mentions `font-loading.spec.ts`, `derive-font-metrics.test.ts`, `verify-font-metrics.test.ts`, `measure-font-payload.test.ts`.
- [ ] 6.3 Update `AGENTS.md` if it references the typography contract. Files: `AGENTS.md`. Acceptance: any mention of "fonts deferred" is removed.

## 7. Phase 7 — Verification

- [ ] 7.1 Run the full local gate sweep: `npm run typecheck && npm run build && npm run postbuild && npm test && npm run lint:sg:ci`. Acceptance: all exit zero.
- [ ] 7.2 Run `openspec validate --strict self-host-woff2-fonts` once more. Acceptance: validation passes.
- [ ] 7.3 Manual visual inspection: load `/`, `/platform`, `/writing/<slug>` in a real browser; confirm:
  - Space Grotesk renders the hero h1 on marketing routes.
  - Fraunces renders italic emphasis on long-form routes.
  - System fallback renders cleanly on slow connections (devtools throttle to "Slow 3G").
  - No FOUT / FOIT artifacts visible (font-display: swap working correctly).
  - DevTools network panel shows ≤ 1 font request before LCP fires.
- [ ] 7.4 Push branch; confirm `quick-checks.yml` (when added by `modernize-unit-tests-with-vitest`) and `playwright.yml` both succeed. Acceptance: PR shows both green.
- [ ] 7.5 Cross-coordinate with `update-site-marketing-redesign`: amend USMR Phase 2.3, 2.3a, 2.3b, 2.4, 2.5 to mark `[~]` with deferral note pointing at this change. Files: `openspec/changes/update-site-marketing-redesign/tasks.md`. Acceptance: deferral notes added; openspec validate still passes for USMR.
