## Why

The site's CSP is locked to `font-src 'self'` (per `update-site-marketing-redesign` Phase 2.7) and a postbuild guard (`scripts/verify-font-self-hosting.mjs`) refuses any third-party font CDN reference in `.build/dist/`. Both shipped to `main` via PR #43 (commit `0712de2`). But `public/assets/fonts/` does not yet exist — the policy promises self-hosting that hasn't shipped. Today the site has effectively no custom typography because both Google Fonts and any CDN load is blocked by the policy, and there is no on-disk WOFF2 to serve.

> **Note on prior Copilot review of this PR:** Copilot's round-1 inline comments asserted that `scripts/verify-font-self-hosting.mjs`, `scripts/lint-tokens.mjs`, and the `lint:tokens` npm script "do not exist." Those comments were posted BEFORE PR #43 merged into `main`. Post-merge those scripts are present and wired into postbuild. The references in this proposal/design/spec are correct against current `main`.

USMR Phase 2 specifies the typeface set (Inter Tight, Space Grotesk, Fraunces, Instrument Serif, JetBrains Mono — DESIGN.md §3.1) and pinned the contract details across five tasks (2.3, 2.3a, 2.3b, 2.4, 2.5), but every task is still `[ ]` because USMR's scope is the redesign as a whole. Decoupling font self-hosting into its own change lets the work ship independently of the larger redesign, removes the false-promise CSP risk, and unblocks any route that wants to use a custom face today.

This change is **host-agnostic** — it places WOFF2 binaries under `public/assets/fonts/` which any static host serves verbatim. A separate change `migrate-deploy-to-cloudflare-pages` covers the host migration; the two are independent.

## What Changes

- Source 5 typefaces from upstream foundries with permissive licenses, subset to Latin + Latin-Extended + numeric punctuation, output as **WOFF2** under `public/assets/fonts/<family>/<weight>-<style>.woff2`. Ship `LICENSE.txt` per family.
- Add `@font-face` blocks in `public/assets/theme.css` for each face with: `font-display: swap`, `unicode-range` (subset bounds), `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` (derived from system fallback metrics).
- **Non-display families (Fraunces, Instrument Serif) MUST NOT load on routes that don't use them.** Per-route `<link rel="preload">` emits ONLY the LCP-critical face for that route (Space Grotesk on marketing routes per DESIGN.md). Other faces lazy-load via the cascade.
- Build `scripts/measure-font-payload.mjs` (`npm run measure:font-payload`): fails the build if total WOFF2 per route > 180 KB OR per-family > 60 KB. Wires into postbuild.
- Build `scripts/derive-font-metrics.mjs` (one-shot generator) + `scripts/verify-font-metrics.mjs` (CI gate): derives `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` from each WOFF2's `head` + `OS/2` tables vs the configured fallback (`system-ui` for sans, `Georgia` for serif, `ui-monospace` for mono). Verify gate fails if `theme.css` overrides drift from re-derived values.
- Add `node:test` tests for `measure-font-payload.mjs`, `verify-font-metrics.mjs`, and `verify-font-subset-coverage.mjs` (mkdtemp + synthetic `dist/` fixtures), following the flat `tests/*.test.mjs` layout.
- Wire `verify:font-metrics` into postbuild after `verify-font-self-hosting`.

## Capabilities

### New Capabilities

- `font-self-hosting`: governs the contract for WOFF2 binaries under `public/assets/fonts/`, the `@font-face` declaration shape, the per-route preload rule, the payload budgets (180 KB total / 60 KB per family), the metrics-override derivation, and the `font-display: swap` requirement.

### Modified Capabilities

- `style-system`: The existing requirements **Self-hosted WOFF2 Fonts with Metrics Overrides** and **Font Payload Budget** under `update-site-marketing-redesign/specs/style-system/spec.md` move into the new `font-self-hosting` capability, with `style-system` retaining only the typography-token half (clamp scale, line-heights, tracking). When USMR archives, its `style-system` requirements amend to cross-reference `font-self-hosting`.
- `check-site-quality`: ADDED requirement "Font Metrics Verification Gate" — `verify:font-metrics` MUST run in postbuild and fail the build on metrics drift.

## Impact

- **Affected code**:
  - `public/assets/fonts/` (NEW — 5 family subdirs, ~5-10 WOFF2 files total + 5 LICENSE.txt files)
  - `public/assets/theme.css` (NEW @font-face block; integrates with existing `--font-*` tokens)
  - `src/layouts/BaseLayout.astro` (NEW per-route preload-link emission, scoped via Astro `props`)
  - `scripts/measure-font-payload.mjs` (NEW)
  - `scripts/derive-font-metrics.mjs` (NEW one-shot)
  - `scripts/verify-font-metrics.mjs` (NEW gate)
  - `scripts/verify-font-subset-coverage.mjs` (NEW gate — scans `src/content/**/*.mdx` + `src/pages/**/*.{astro,mdx}` for codepoints outside the declared subset bounds)
  - `package.json` (postbuild chain extension; new `measure:font-payload`, `verify:font-metrics`, `derive:font-metrics`, `verify:font-subset-coverage` npm scripts)
- **Affected dependencies**:
  - **REQUIRED dev-dep** for the metrics gate: a WOFF2 → SFNT decompressor (e.g., `wawoff2` or `fontkit` which embeds Brotli decoding). Raw WOFF2 bytes are Brotli-compressed SFNT tables; `derive-font-metrics.mjs` and `verify-font-metrics.mjs` cannot read `head` / `OS/2` / `cmap` directly without decompressing. The dependency is HARD, not optional. (Per multi-reviewer-r1 finding [CR-003].)
  - **Optional dev-dep** for one-shot subset generation: `subset-font`. Used by maintainer when adding/replacing a face; binaries are committed verbatim afterward. CI never re-runs subsetting.
  - No runtime deps.
- **Affected workflows**: postbuild gate gains font-metrics verification, font payload measurement, and font subset coverage checking.
- **Affected specs**: NEW `openspec/specs/font-self-hosting/spec.md`; MODIFIED `style-system` (forward-reference, amends on USMR archive).
- **Sequencing**:
  - Independent of `migrate-deploy-to-cloudflare-pages` — self-hosted WOFF2 ships on any static host.
  - Coexists with `update-site-marketing-redesign` — when USMR archives, its style-system requirements 2.3/2.3a/2.3b/2.4/2.5 mark `[~]` with cross-reference to this change. This change ALSO ships a MODIFIED delta against USMR's `specs/style-system/spec.md` REMOVING the duplicated `Self-hosted WOFF2 Fonts with Metrics Overrides` and `Font Payload Budget` Requirements (they migrate into `font-self-hosting`). Per multi-reviewer-r1 finding [H-2].
  - Coexists with `migrate-legacy-tokens-to-layer` — the cascade-layer wrap of theme.css doesn't affect `@font-face` placement (font-faces sit at root, outside layers, per CSS spec).
  - **Postbuild chain coordination** with `migrate-deploy-to-cloudflare-pages` (PR #45). Both PRs add gates to `npm run postbuild`: this change adds `verify:font-metrics` + `measure:font-payload` + `verify:font-subset-coverage`; PR #45 adds `verify:headers`. Whichever PR merges second MUST rebase the postbuild line so all new gates appear in the chain; per multi-reviewer-r1 finding [H-1]. The full target chain (assuming both PRs land) is: `verify:prerequisites && verify:design-prerequisites && lint:tokens && verify-font-self-hosting && verify:font-metrics && measure:font-payload && verify:font-subset-coverage && sri && csp && verify:headers && lint:design && lint:design-md-uniqueness`.
- **Backwards compatibility**: System-font fallback chain remains (`system-ui, -apple-system, …`). If the WOFF2 fails to load (network error, blocked, etc.), fallback typography renders cleanly via the metrics overrides — CLS stays under 0.05 per the existing payload-budget scenario.

## Prerequisites

This change does NOT depend on `modernize-unit-tests-with-vitest` landing first. New unit tests added by this change ship as `tests/<name>.test.mjs` using the existing `node:test` umbrella (matches today's flat `tests/*.test.{mjs,mts}` layout). When `modernize-unit-tests-with-vitest` archives, those tests migrate to `tests/unit/<name>.test.ts` as part of that change's Phase 2 sweep.

This means tasks below reference `tests/<name>.test.mjs` (flat layout), NOT `tests/unit/<name>.test.ts` (Vitest layout). Per multi-reviewer-r1 finding [M-1].

## Out of Scope

- **Cloudflare Pages / GitHub Pages migration**: tracked separately as `migrate-deploy-to-cloudflare-pages`. Rationale: the WOFF2 contract is host-agnostic; whichever host serves `public/` works.
- **Variable fonts**: this change ships static-instance WOFF2 only. Rationale: simpler subsetting story; variable-font payload isn't measurably better for the small weight set we use (Inter Tight 400/500/700; Space Grotesk 400/500/700).
- **Runtime font swap UI** (`data-hero-font`): the dev-only Tweaks panel exposes this today; no runtime user-facing UI is in scope here.
- **Web Font Loader / fontfaceobserver**: native CSS `font-display: swap` covers the LCP target; no JS font-loader API needed.
- **Subsetting Cyrillic, CJK, or Devanagari**: site is Latin-only today. Rationale: minimum viable payload; subsetting expansion is a follow-up if/when localization lands.
- **Font hosting via R2 or other object storage**: same-origin only per CSP `'self'`. Rationale: avoids CSP exception + CORS + preconnect cost; bytes ship inside `.build/dist/` like any other static asset.
- **Italic forms beyond Fraunces**: only Fraunces ships an italic (it's an editorial-display face that uses italic for emphasis); other faces are roman-only. Rationale: 50% payload reduction; italic emphasis on body text uses the OS-italic synthesis as a fallback.
