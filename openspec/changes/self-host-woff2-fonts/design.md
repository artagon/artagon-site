## Context

The repo today is in a "fonts-promised-but-not-shipped" state:

- CSP `font-src 'self'` is enforced (PR #43 landed in `main`); `verify-font-self-hosting.mjs` postbuild gate refuses any third-party font CDN reference under `.build/dist/**/*.{html,css,svg}` (the configured output dir per `build.config.json`).
- `public/assets/fonts/` does NOT exist on `main`. No `@font-face` blocks in `public/assets/theme.css`.
- DESIGN.md §3.1 specifies: Inter Tight (display + body), Space Grotesk (hero display via `[data-hero-font="grotesk"]`), Fraunces (editorial italic), Instrument Serif (long-form), JetBrains Mono (code).
- USMR `update-site-marketing-redesign` Phase 2.3-2.5 specs the WOFF2 contract but is `[ ]` because USMR scope is the redesign as a whole — fonts can ship independently.
- Per-route preload-link is required because non-display families (Fraunces, Instrument Serif) appear only on long-form `/writing/*` routes per DESIGN.md.

This change extracts the font-self-hosting work into its own OpenSpec change so it can ship without waiting for the redesign.

The work is **host-agnostic**: WOFF2 binaries served from `public/assets/fonts/` are loaded via same-origin `<link rel="preload">` regardless of whether the host is GitHub Pages or Cloudflare Pages. The companion change `migrate-deploy-to-cloudflare-pages` operates orthogonally.

## Goals / Non-Goals

**Goals:**

- Ship 5 self-hosted WOFF2 typefaces under `public/assets/fonts/` with proper licenses.
- Each route loads ONLY the WOFF2 it needs; non-display families don't preload on marketing routes.
- `font-display: swap` ensures system-font fallback renders before WOFF2 arrives; `size-adjust` + `*-override` metrics keep CLS < 0.05 across the swap.
- Postbuild gates fail the build on payload regressions (180 KB total / 60 KB family) AND on metrics drift (override values diverge from re-derived).
- All faces subset to Latin + Latin-Extended + numeric punctuation only.
- License compliance: every shipped face has a `LICENSE.txt` sibling per upstream.

**Non-Goals:**

- Cloudflare migration. (Separate change.)
- Variable fonts. (Static instances only — simpler subset story.)
- Cyrillic / CJK / RTL subsetting.
- Web Font Loader JS API. (Native `font-display: swap` is sufficient.)
- Italic / oblique synthesis beyond Fraunces.
- Shipping fonts via R2 / S3 / external CDN. (Same-origin only per CSP.)

## Decisions

### D1: Subset bounds — Latin + Latin-Extended + Numeric

Subset each WOFF2 to U+0020-007F (Basic Latin), U+00A0-024F (Latin-1 Supplement + Latin Extended-A/B), U+2010-2027, U+202F (NARROW NO-BREAK SPACE — French typography), U+2030-205E (general punctuation), U+2070-209F (super/sub), U+20A0-20BF (currency), U+2122 (TM), U+25CF (•), U+FB00-FB04 (ligatures `fi`, `fl`).

**Alternative considered:** ship full glyph set. Rejected — typical 8x bytes overhead, exceeds 60 KB/family budget on Inter Tight + Fraunces.

**Alternative considered:** subset narrower (Basic Latin only). Rejected — DESIGN.md prose uses curly quotes (U+201C-201D), em-dash (U+2014), and editorial typography needs ligatures.

### D2: WOFF2 only — no WOFF / TTF fallback

Ship `.woff2` only. Browser support: Chrome 36+, Firefox 39+, Safari 12+, Edge 14+ — universal post-2018.

**Alternative considered:** WOFF + WOFF2 dual. Rejected — doubles payload, no users on browsers that lack WOFF2 in 2026.

### D3: Per-route preload via Astro slot

`BaseLayout.astro` accepts an `Astro.props.preloadFonts?: string[]` prop where each entry uses the form `"<family>/<weight>-<style>"` — identical to the on-disk path segment per D7. Default is `["space-grotesk/500-normal"]` (LCP-critical for marketing routes per DESIGN.md). Long-form `/writing/*` routes pass `preloadFonts={["fraunces/400-italic", "space-grotesk/500-normal"]}`.

The slash-format face-id maps directly onto the D7 on-disk path with **no parsing required** — the href template literal just prepends `/assets/fonts/` and appends `.woff2`. Per Copilot review on PR #44 findings [F7, F15, F16].

```astro
---
// preloadFonts prop: array of "<family>/<weight>-<style>" face-ids — each maps
// directly onto the D7 on-disk path with no string-splitting required.
// Examples: "space-grotesk/500-normal", "fraunces/400-italic"
const { preloadFonts = ["space-grotesk/500-normal"] } = Astro.props;
---
{preloadFonts.map((face) => (
  <link
    rel="preload"
    as="font"
    type="font/woff2"
    crossorigin
    href={`/assets/fonts/${face}.woff2`}
  />
))}
```

The construction is mechanical and deterministic; the spec scenario "Marketing route preloads Space Grotesk" asserts the resolved href is `/assets/fonts/space-grotesk/500-normal.woff2`. Long-form routes pass `["fraunces/400-italic", "space-grotesk/500-normal"]` → 2 preload-links. The 1-2 per-route bound is enforced by the spec scenario "Preload count is bounded".

`crossorigin` attribute REQUIRED on preload-link even for same-origin per spec (otherwise the browser fetches twice).

**Alternative considered:** preload all 5 LCP-shape faces on every route. Rejected — exceeds 180 KB/route budget.

**Alternative considered:** no preload, lazy-load via `@font-face` only. Rejected — adds 100-200ms LCP penalty on cold-cache marketing routes.

### D4: Metrics derivation pipeline

`scripts/derive-font-metrics.mjs` (one-shot, run by maintainer when adding/replacing a face) reads each WOFF2's `head` table (`unitsPerEm`) + `OS/2` table (`sTypoAscender`, `sTypoDescender`, `sTypoLineGap`, `xAvgCharWidth`) using a minimal WOFF2 parser, then computes:

- `size-adjust = round(fallback.xAvgCharWidth / face.xAvgCharWidth * 100, 1)%`
- `ascent-override = round(face.sTypoAscender / face.unitsPerEm * 100, 1)%`
- (similar for descent + line-gap)

Output modes:

- **Default (no flag):** prints the derived `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` values to stdout as a CSS-compatible block for review. Maintainer reviews then re-runs with `--write` to apply.
- **`--write` mode:** patches each `@font-face` block in `public/assets/theme.css` in-place via stable comment-anchor markers (`/* derive-font-metrics:start */` / `/* derive-font-metrics:end */`) so re-runs are idempotent. The maintainer reviews the resulting diff before committing. This is the canonical workflow per spec scenario "Override values derived programmatically" — manual hand-editing of the four override values in `theme.css` is FORBIDDEN per the `@font-face` Declarations requirement; use `--write`. Per Copilot review on PR #44 findings [F8, F17].

`scripts/verify-font-metrics.mjs` (CI gate, run every postbuild) re-parses each WOFF2 and re-computes the metrics. Compares against `theme.css` declarations. Fails build if any value drifts > 0.5%. The 0.5% threshold is below the visually-detectable contribution to CLS at typical font-size ranges (h1 — 56-108px; body — 16px; sub-pixel rounding stays below the perceptual threshold). Source: Chrome DevRel's "Improved font fallbacks" (https://developer.chrome.com/blog/font-fallbacks) — the canonical write-up for the `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` mechanism, including the empirical drift-vs-CLS tolerance band this gate enforces. Tightening to 0.1% creates CI flake from rounding noise; loosening to 1% lets perceptible CLS shifts ship. 0.5% is the documented engineering floor. Per multi-reviewer-r1 finding [L-2].

**Alternative considered:** generate `@font-face` blocks via build step. Rejected — adds runtime moving parts; static commit makes the contract greppable and reviewable.

**Alternative considered:** trust upstream metrics (no override). Rejected — system-fallback CLS measurably exceeds 0.05 without overrides on Inter Tight + Fraunces (per Bram Stein's font-loading research).

### D5: Payload budget enforcement

`scripts/measure-font-payload.mjs`:

1. Walks `.build/dist/**/*.html` (the configured output dir per `build.config.json`), parses `<link rel="preload" as="font">` and `<link rel="stylesheet">` (which may transitively reference `@font-face` URIs).
2. Resolves each WOFF2 URL to its on-disk byte size.
3. Per-route: sum referenced WOFF2 bytes. Fail if > 180 KB.
4. Per-family-per-route: sum bytes of WOFF2s sharing a family. Fail if > 60 KB.
5. Across all routes: emit summary with worst-case route + family size.

**Alternative considered:** budget at family-level globally (sum of all families' WOFF2 bytes regardless of route usage). Rejected — punishes Fraunces (long-form-only) for being large when it's irrelevant on marketing routes.

### D6: License hygiene

Each family ships a `LICENSE.txt` sibling under its dir:

```
public/assets/fonts/inter-tight/LICENSE.txt
public/assets/fonts/space-grotesk/LICENSE.txt
public/assets/fonts/fraunces/LICENSE.txt
public/assets/fonts/instrument-serif/LICENSE.txt
public/assets/fonts/jetbrains-mono/LICENSE.txt
```

All 5 use SIL OFL 1.1 (Open Font License). License text vendored verbatim from upstream.

**Alternative considered:** a single `public/assets/fonts/LICENSES.md` with all 5. Rejected — OFL § 5 requires the license to ship with the binary; per-dir is the safest interpretation.

### D7: File naming convention

```
public/assets/fonts/<family>/<weight>-<style>.woff2

Examples:
  inter-tight/400-normal.woff2
  inter-tight/500-normal.woff2
  inter-tight/700-normal.woff2
  space-grotesk/500-normal.woff2
  fraunces/400-italic.woff2
  jetbrains-mono/400-normal.woff2
```

`<family>` matches the kebab-case `font-family` declaration. `<weight>` is the 100-900 numeric. `<style>` is `normal` or `italic`.

The `preloadFonts` prop uses the `"<family>/<weight>-<style>"` format — identical to the on-disk path segment — so the href template literal requires no transformation: `preloadFonts={["space-grotesk/500-normal"]}` → `href="/assets/fonts/space-grotesk/500-normal.woff2"`.

**Alternative considered:** flat layout `public/assets/fonts/space-grotesk-500.woff2`. Rejected — license file placement gets awkward (one license per binary).

### D8: Test strategy

- **Unit (`node:test`)**: `tests/measure-font-payload.test.mjs`, `tests/verify-font-metrics.test.mjs`, `tests/verify-font-subset-coverage.test.mjs`. Flat layout matching the live three-runner convention (`tests/*.test.mjs` for node:test, `tests/*.test.mts` for vitest, `tests/*.spec.ts` for Playwright; see Prerequisites in proposal.md). mkdtemp + synthetic `.build/dist/`. Fixtures: a tiny pre-canned WOFF2 (under 1 KB; just enough for parser to read head + OS/2).
- **Integration (Playwright)**: NEW `tests/font-loading.spec.ts` (flat layout per Prerequisites). Loads `/`, asserts `getComputedStyle(h1).fontFamily` resolves to "Space Grotesk", asserts the network request for `space-grotesk/500-normal.woff2` was made AND it was the only font request before LCP fired.
- **Visual regression**: existing `tests/styling-snapshots.spec.ts` baseline absorbs the WOFF2 typography change; baseline must be regenerated via `workflow_dispatch`.
- **CLS gate**: USMR Phase 12.3 already specifies CLS < 0.1 via Playwright; the metrics-override work in this change keeps font-swap CLS well under that threshold.

## Risks / Trade-offs

| Risk                                                                                                                                                                              | Mitigation                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Upstream font binary changes (OFL allows redistribution but not modification of design — re-subsetting our copy is fine; bumping to a new version is a deliberate maintainer act) | Pin SHA256 of each `.woff2` in a `public/assets/fonts/CHECKSUMS` file; `verify-font-metrics.mjs` checks SHA before parse.                                                                                                                                                                                                                                                                  |
| Subsetting tool reproducibility (`subset-font` ESM API may differ across versions)                                                                                                | One-shot derivation: maintainer pins the dev-dep, runs once, commits the WOFF2 binaries. CI never re-runs subsetting.                                                                                                                                                                                                                                                                      |
| Per-route preload prop ergonomics — contributors forget to pass `preloadFonts` on long-form routes                                                                                | Default to `["space-grotesk/500-normal"]`. Long-form routes that need Fraunces explicitly opt in. The `font-display: swap` fallback ensures missing-preload doesn't break rendering, just adds LCP cost.                                                                                                                                                                                   |
| Metrics-override drift between `theme.css` and live binaries                                                                                                                      | `verify-font-metrics.mjs` re-derives every postbuild; > 0.5% drift fails. Maintainer must re-derive via `derive-font-metrics.mjs --write` and commit.                                                                                                                                                                                                                                      |
| WOFF2 subset misses a glyph used somewhere in MDX content                                                                                                                         | NEW `scripts/verify-font-subset-coverage.mjs` walks `src/content/**/*.mdx` + `src/pages/**/*.{astro,mdx}` and fails if any codepoint falls outside the declared subset bounds. Wired into postbuild after `verify:font-metrics`. (Replaces an earlier draft that suggested extending `lint:design`; that script only validates DESIGN.md, not page content. Per Copilot review on PR #44.) |
| 180 KB / 60 KB budgets too tight for adding more weights later                                                                                                                    | Documented as the floor; raising them requires a follow-up OpenSpec change with `lighthouse-ci` perf evidence.                                                                                                                                                                                                                                                                             |
| Font preload races SRI hash injection in postbuild                                                                                                                                | Audit: preload-link writes happen during Astro build (compile-time); SRI runs postbuild. No race.                                                                                                                                                                                                                                                                                          |

## Migration Plan

This change is purely additive — no existing behavior is modified, only added.

**Phases (one commit each for review-ability):**

1. **Phase 0 — Pre-flight**: source upstream WOFF binaries + LICENSE.txt for all 5 families. Subset locally via `subset-font`. Commit binaries + checksums.
2. **Phase 1 — Build the metrics pipeline**: `derive-font-metrics.mjs` (one-shot) + `verify-font-metrics.mjs` (gate). `node:test` tests both.
3. **Phase 2 — `@font-face` declarations**: add to `public/assets/theme.css`. Run `derive-font-metrics.mjs` to populate override values. Commit theme.css + the generated values.
4. **Phase 3 — Per-route preload**: `BaseLayout.astro` accepts `preloadFonts?: string[]` prop; each route page passes the right face-id array. Marketing routes use the default `["space-grotesk/500-normal"]`; `/writing/*` routes pass `["fraunces/400-italic", "space-grotesk/500-normal"]`.
5. **Phase 4 — Payload budget**: `measure-font-payload.mjs`. `node:test` tests. Wire into postbuild.
6. **Phase 5 — Documentation**: update `tests/README.md`, `AGENTS.md` if applicable.

**Rollback strategy:** the change is additive; reverting Phase 4 (the gate) is safe if budgets prove too tight. Reverting earlier phases removes the WOFF2 set; system-font fallback chain renders cleanly.

## Open Questions

1. **Source repo for upstream WOFF binaries** — Inter Tight is on rsms/inter; Fraunces is undercase/fraunces; Space Grotesk is florianschulz/space-grotesk; Instrument Serif is is-foundation/instrument-serif; JetBrains Mono is jetbrains/jetbrainsmono. All Apache/OFL. Decision: vendor latest stable release per family; pin commit SHA in `package.json` scripts metadata. (Not blocking — confirms in implementation.)
2. **Whether to add a `font-display: optional` variant for the LCP-critical face** to skip swap entirely on slow connections. Decision: defer to a follow-up perf-tuning change; default `swap` is the spec.
3. **Whether `tests/font-loading.spec.ts` should be in this change or in `update-site-marketing-redesign` Phase 12** — the test asserts a behavior that becomes meaningful once the redesign uses the fonts. Decision: ship the test in this change with `test.skip` on the redesign-specific assertions; un-skip when USMR archives. (Earlier draft text cited `tests/e2e/font-loading.spec.ts` from the never-authored `modernize-unit-tests-with-vitest` change layout; live convention is flat `tests/` per the three-runner stack.)
