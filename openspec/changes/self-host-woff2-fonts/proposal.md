## Why

The site's CSP is locked to `font-src 'self'` (per `update-site-marketing-redesign` Phase 2.7) and a postbuild guard (`scripts/verify-font-self-hosting.mjs`) refuses any third-party font CDN reference in `dist/`. But `public/assets/fonts/` does not yet exist — the policy promises self-hosting that hasn't shipped. Today the site has effectively no custom typography because both Google Fonts and any CDN load is blocked by the policy, and there is no on-disk WOFF2 to serve.

USMR Phase 2 specifies the typeface set (Inter Tight, Space Grotesk, Fraunces, Instrument Serif, JetBrains Mono — DESIGN.md §3.1) and pinned the contract details across five tasks (2.3, 2.3a, 2.3b, 2.4, 2.5), but every task is still `[ ]` because USMR's scope is the redesign as a whole. Decoupling font self-hosting into its own change lets the work ship independently of the larger redesign, removes the false-promise CSP risk, and unblocks any route that wants to use a custom face today.

This change is **host-agnostic** — it places WOFF2 binaries under `public/assets/fonts/` which any static host serves verbatim. A separate change `migrate-deploy-to-cloudflare-pages` covers the host migration; the two are independent.

## What Changes

- Source 5 typefaces from upstream foundries with permissive licenses, subset to Latin + Latin-Extended + numeric punctuation, output as **WOFF2** under `public/assets/fonts/<family>/<weight>-<style>.woff2`. Ship `LICENSE.txt` per family.
- Add `@font-face` blocks in `public/assets/theme.css` for each face with: `font-display: swap`, `unicode-range` (subset bounds), `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` (derived from system fallback metrics).
- **Non-display families (Fraunces, Instrument Serif) MUST NOT load on routes that don't use them.** Per-route `<link rel="preload">` emits ONLY the LCP-critical face for that route (Space Grotesk on marketing routes per DESIGN.md). Other faces lazy-load via the cascade.
- Build `scripts/measure-font-payload.mjs` (`npm run measure:font-payload`): fails the build if total WOFF2 per route > 180 KB OR per-family > 60 KB. Wires into postbuild.
- Build `scripts/derive-font-metrics.mjs` (one-shot generator) + `scripts/verify-font-metrics.mjs` (CI gate): derives `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` from each WOFF2's `head` + `OS/2` tables vs the configured fallback (`system-ui` for sans, `Georgia` for serif, `ui-monospace` for mono). Verify gate fails if `theme.css` overrides drift from re-derived values.
- Add Vitest tests for `measure-font-payload.mjs` and `verify-font-metrics.mjs` (mkdtemp + synthetic `dist/` fixtures).
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
  - `package.json` (postbuild chain extension; new `measure:font-payload`, `verify:font-metrics`, `derive:font-metrics` npm scripts)
- **Affected dependencies**: Optional dev-dep `subset-font` or `wawoff2` for one-shot WOFF2 generation (used by `derive-font-metrics.mjs` setup; binaries committed verbatim once derived). No runtime deps.
- **Affected workflows**: postbuild gate gains font-metrics verification.
- **Affected specs**: NEW `openspec/specs/font-self-hosting/spec.md`; MODIFIED `style-system` (forward-reference, amends on USMR archive).
- **Sequencing**:
  - Independent of `migrate-deploy-to-cloudflare-pages` — self-hosted WOFF2 ships on any static host.
  - Coexists with `update-site-marketing-redesign` — when USMR archives, its style-system requirements 2.3/2.3a/2.3b/2.4/2.5 mark `[~]` with cross-reference to this change.
  - Coexists with `migrate-legacy-tokens-to-layer` — the cascade-layer wrap of theme.css doesn't affect `@font-face` placement (font-faces sit at root, outside layers, per CSS spec).
- **Backwards compatibility**: System-font fallback chain remains (`system-ui, -apple-system, …`). If the WOFF2 fails to load (network error, blocked, etc.), fallback typography renders cleanly via the metrics overrides — CLS stays under 0.05 per the existing payload-budget scenario.

## Out of Scope

- **Cloudflare Pages / GitHub Pages migration**: tracked separately as `migrate-deploy-to-cloudflare-pages`. Rationale: the WOFF2 contract is host-agnostic; whichever host serves `public/` works.
- **Variable fonts**: this change ships static-instance WOFF2 only. Rationale: simpler subsetting story; variable-font payload isn't measurably better for the small weight set we use (Inter Tight 400/500/700; Space Grotesk 400/500/700).
- **Runtime font swap UI** (`data-hero-font`): the dev-only Tweaks panel exposes this today; no runtime user-facing UI is in scope here.
- **Web Font Loader / fontfaceobserver**: native CSS `font-display: swap` covers the LCP target; no JS font-loader API needed.
- **Subsetting Cyrillic, CJK, or Devanagari**: site is Latin-only today. Rationale: minimum viable payload; subsetting expansion is a follow-up if/when localization lands.
- **Font hosting via R2 or other object storage**: same-origin only per CSP `'self'`. Rationale: avoids CSP exception + CORS + preconnect cost; bytes ship inside `dist/` like any other static asset.
- **Italic forms beyond Fraunces**: only Fraunces ships an italic (it's an editorial-display face that uses italic for emphasis); other faces are roman-only. Rationale: 50% payload reduction; italic emphasis on body text uses the OS-italic synthesis as a fallback.
