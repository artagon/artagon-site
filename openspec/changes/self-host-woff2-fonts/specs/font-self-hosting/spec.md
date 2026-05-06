## ADDED Requirements

### Requirement: Self-hosted WOFF2 binaries

All custom typefaces MUST be served from `public/assets/fonts/<family>/<weight>-<style>.woff2` (same-origin). Each family directory MUST ship a sibling `LICENSE.txt` containing the verbatim upstream license. WOFF2 is the ONLY format shipped — no WOFF1, TTF, EOT, or SVG fallbacks. Browsers without WOFF2 support (pre-2018) fall through to the system-font fallback chain via `font-display: swap`.

#### Scenario: Font directory layout matches the convention

- **WHEN** the repo is inspected at `public/assets/fonts/`
- **THEN** each subdirectory's name matches the kebab-case `font-family` value declared in `theme.css`, contains one or more `<weight>-<style>.woff2` files, and contains a `LICENSE.txt` file with non-zero byte count.

#### Scenario: No third-party font CDN reference in built tree

- **WHEN** `npm run postbuild` finishes
- **THEN** `scripts/verify-font-self-hosting.mjs` finds zero references to forbidden font hosts (fonts.googleapis.com, fonts.gstatic.com, etc.) in any `.build/dist/**/*.{html,css,svg}` file.

### Requirement: `@font-face` Declarations with Metrics Overrides

Each WOFF2 face MUST be registered via a `@font-face` block in `public/assets/theme.css` with the following properties: `font-family`, `font-weight`, `font-style`, `font-display: swap`, `unicode-range` (subset bounds), `src: url(...) format("woff2")`, `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`. The four override values MUST be derived from the WOFF2's `head` and `OS/2` tables vs the configured fallback face's metrics; manual hand-tuning of these values is FORBIDDEN.

#### Scenario: Override values derived programmatically

- **WHEN** a maintainer adds a new face
- **THEN** they run `node scripts/derive-font-metrics.mjs --write` and the resulting `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` values are written into the `@font-face` block in `theme.css` verbatim.

#### Scenario: Drift between live overrides and re-derived values fails the build

- **WHEN** `npm run postbuild` runs and any override value in `theme.css` differs from the value `verify-font-metrics.mjs` re-derives by more than 0.5%
- **THEN** the build exits non-zero with the offending family + weight + property + actual-vs-expected diff.

#### Scenario: font-display swap is mandatory

- **WHEN** `theme.css` is parsed
- **THEN** every `@font-face` block contains `font-display: swap;` — no `auto`, `block`, `optional`, or `fallback`.

### Requirement: LCP-critical Per-Route Font Preload

Each route MUST emit between 1 and 2 `<link rel="preload" as="font" type="font/woff2" crossorigin>` tags in `<head>`, each pointing at a WOFF2 most likely to render an LCP-critical element on that route. The combined byte total of all preload-linked WOFF2s on a single route MUST stay under the per-route 180 KB budget enforced by `Font Payload Budget`. Marketing routes (`/`, `/platform`, `/use-cases`, `/standards`, `/roadmap`) preload Space Grotesk 500 only. Long-form routes (`/writing/*`) MAY preload BOTH Fraunces 400 italic (LCP body) AND Space Grotesk 500 (above-the-fold heading) — combined ≤ 90 KB. The preload-link MUST resolve to a same-origin `/assets/fonts/...` URL; cross-origin font preload is FORBIDDEN. Per multi-reviewer-r1 finding [M-2].

#### Scenario: Marketing route preloads Space Grotesk

- **WHEN** the home route's HTML is inspected
- **THEN** the `<head>` contains exactly one `<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/space-grotesk/500-normal.woff2">` (marketing routes preload only the heading face).

#### Scenario: Long-form route preloads up to 2 LCP-critical faces

- **WHEN** any `/writing/<slug>` route's HTML is inspected
- **THEN** the `<head>` contains 1-2 preload-links, at least one pointing at `/assets/fonts/fraunces/400-italic.woff2` (LCP body); a second preload for Space Grotesk 500 (above-the-fold heading) is permitted when combined preload bytes ≤ 90 KB.

#### Scenario: Preload count is bounded

- **WHEN** any built route's HTML is inspected
- **THEN** the count of `<link rel="preload" as="font">` tags in `<head>` is between 1 and 2 inclusive; 0 preloads is forbidden (LCP regression); ≥ 3 preloads is forbidden (over-budget risk).

#### Scenario: crossorigin attribute is mandatory

- **WHEN** any preload-link in any built route is inspected
- **THEN** the tag carries the `crossorigin` attribute (no value needed; per HTML spec, presence implies anonymous mode); preloads without `crossorigin` would cause a double-fetch.

#### Scenario: No third-party preload origin

- **WHEN** any preload-link's `href` is inspected
- **THEN** it is path-only (begins with `/`); NO absolute URL with `://` is allowed.

### Requirement: Font Payload Budget

Total WOFF2 bytes referenced by any single route MUST NOT exceed 180 KB. Per-family bytes referenced by any single route MUST NOT exceed 60 KB. `scripts/measure-font-payload.mjs` (`npm run measure:font-payload`) MUST measure these bounds against `.build/dist/` (the configured output dir per `build.config.json`) after build and exit non-zero on violation.

Lowering either threshold via PR is allowed if current usage is below the new floor; raising either threshold requires a follow-up OpenSpec change with Lighthouse CI performance-regression evidence.

#### Scenario: Single route under both budgets

- **WHEN** `measure-font-payload.mjs` runs against `.build/dist/`
- **THEN** every route reports total ≤ 180 KB and per-family ≤ 60 KB.

#### Scenario: Adding a heavy weight fails the budget

- **WHEN** a contributor adds Inter Tight 400-italic (a new style) and the home route's total Inter Tight family exceeds 60 KB
- **THEN** `measure-font-payload.mjs` exits non-zero with the offending family + route + actual vs expected. (Inter Tight tops out at weight 700; using a new style — italic — is the realistic example for a budget-busting addition.)

### Requirement: WOFF2 Subset Bounds

Every shipped WOFF2 MUST be subset to the following Unicode ranges only: `U+0020-007F` (Basic Latin), `U+00A0-024F` (Latin-1 Supplement + Latin Extended-A/B), `U+2010-2027`, `U+202F` (NARROW NO-BREAK SPACE — French typography support), `U+2030-205E` (general punctuation), `U+2070-209F` (super/sub), `U+20A0-20BF` (currency), `U+2122` (TM), `U+25CF` (•), `U+FB00-FB04` (ligatures `fi`, `fl`). Cyrillic, CJK, RTL scripts, and Greek-extended are explicitly NOT subset. Per multi-reviewer-r1 finding [L-1].

The subset bounds MUST match the `unicode-range` declaration in each `@font-face` block; mismatch fails `verify-font-metrics.mjs`.

#### Scenario: Subset matches @font-face range

- **WHEN** `verify-font-metrics.mjs` parses each WOFF2's `cmap` table and compares the actual codepoint coverage to the `unicode-range` declared in `theme.css`
- **THEN** every codepoint in the binary appears within the declared range; no out-of-range codepoint exists.

#### Scenario: Out-of-subset codepoint in MDX prose is detected

- **WHEN** any MDX or Astro file under `src/content/` or `src/pages/` contains a codepoint outside the declared `unicode-range` (e.g. a stray Cyrillic glyph in editorial prose)
- **THEN** `npm run verify:font-subset-coverage` fails with the file:line + codepoint, instructing the contributor to either replace the glyph or expand the subset bounds via an OpenSpec change. (NOTE: a NEW dedicated script `scripts/verify-font-subset-coverage.mjs` is introduced by this change — earlier drafts targeted `lint:design`, but that script only validates DESIGN.md, not page content. Per Copilot review on PR #44 finding [F10].)

### Requirement: License Compliance

Every shipped font face MUST have a `LICENSE.txt` file in its family directory containing the verbatim upstream license (typically SIL OFL 1.1). The license file MUST be at least 1 KB in size (sanity check that it is the actual license text, not a placeholder). Removing or replacing a license file requires the same OpenSpec change that swaps the font.

#### Scenario: Each family ships its license

- **WHEN** `public/assets/fonts/<family>/` is inspected
- **THEN** a `LICENSE.txt` file exists, has ≥ 1 KB, and the first 80 bytes contain the upstream license name (e.g., `Copyright .... SIL Open Font License`).

#### Scenario: Removing a license fails the build

- **WHEN** a contributor removes a `LICENSE.txt` while keeping the WOFF2 binary
- **THEN** `verify-font-metrics.mjs` exits non-zero with `missing license for <family>`.

### Requirement: WOFF2 Binary Pinning

Each WOFF2 binary MUST have its SHA-256 checksum recorded in `public/assets/fonts/CHECKSUMS` (one line per file: `<sha256>  <relative-path>`). `verify-font-metrics.mjs` MUST verify the checksum before parsing each face; mismatch fails the build. This guards against accidental binary corruption AND silent supply-chain swap of a font binary in a PR.

#### Scenario: Checksum drift fails the build

- **WHEN** a contributor replaces `inter-tight/500-normal.woff2` with a different binary but does not update `CHECKSUMS`
- **THEN** `verify-font-metrics.mjs` exits non-zero with `sha256 mismatch for inter-tight/500-normal.woff2`.

#### Scenario: Adding a new face requires a CHECKSUMS entry

- **WHEN** a contributor adds a new WOFF2 file but does not append its checksum to `CHECKSUMS`
- **THEN** `verify-font-metrics.mjs` exits non-zero with `missing CHECKSUMS entry for <path>`.
