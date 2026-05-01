## ADDED Requirements

### Requirement: /brand Gallery Route (DESIGN.md §4.14 Complete)

The site MUST ship a `/brand` route rendering the COMPLETE set of brand variants enumerated in DESIGN.md §4.14 — 13 distinct variants, not a subset. The route MUST consume SVG sources exclusively from `src/data/brand-svgs.ts`; no glyph paths SHALL be inlined in the route's Astro template.

The `BrandSvgs` interface in `src/data/brand-svgs.ts` MUST therefore export factories sufficient to render all 13 variants. The TypeScript types use the `as const satisfies` pattern (per `javascript-typescript:typescript-advanced-types`) so the literal variant names are preserved at the type level:

```typescript
type GlyphVariant =
  | "classic"
  | "tight"
  | "filled"
  | "monochrome"
  | "cropped"
  | "bold";
type WordmarkVariant = "horizontal" | "stacked";
type AvatarVariant = "twilight" | "paper" | "transparent";
type OgCardTheme = "twilight" | "paper";
```

The `bold` glyph variant is load-bearing for ≤32px favicon use cases per DESIGN.md §4.14 (the outer ring vanishes from anti-aliasing at small sizes); without it, `scripts/generate-favicons.mjs` cannot honor the §4.14 sizing rule.

#### Scenario: All 13 variants present

- **WHEN** the built `/brand` route is loaded
- **THEN** the page contains tiles for: `glyph-classic`, `glyph-tight`, `glyph-filled`, `glyph-monochrome`, `glyph-cropped`, `glyph-bold`, `wordmark-horizontal`, `wordmark-stacked`, `avatar-twilight`, `avatar-paper`, `avatar-transparent`, `og-card-twilight`, `og-card-paper` — exactly 13 tile groups matching DESIGN.md §4.14.

#### Scenario: bold favicon variant available for sub-32px

- **WHEN** `scripts/generate-favicons.mjs` runs to produce `favicon-16.png` and `favicon-32.png`
- **THEN** it consumes `SRC.glyph.bold(16)` and `SRC.glyph.bold(32)` (NOT `SRC.glyph.classic`), per the DESIGN.md §4.14 sizing rule.

#### Scenario: avatar variants composite glyph + background

- **WHEN** the gallery renders the avatar tiles
- **THEN** each is a 1024×1024 composite (glyph at 56% ± 2% per DESIGN.md §4.14) with the background per variant: `--bg` for twilight, `--paper` for paper, alpha 0 for transparent.

### Requirement: Copy-SVG Buttons

Each gallery tile MUST render a "Copy SVG" button that, when activated, writes a self-contained `<svg>` document for that variant to the clipboard. The clipboard payload MUST be standalone (no external CSS or `<script>` references) so the SVG can be pasted into any tool. The button MUST NOT require runtime JavaScript beyond a single small Astro island for clipboard access (`navigator.clipboard.writeText`); a no-JS fallback MUST display the SVG markup in a `<details>` block selectable by the user.

#### Scenario: Button copies standalone SVG

- **WHEN** a user clicks the "Copy SVG" button on the `glyph-classic` tile
- **THEN** the clipboard contains a `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ...>...</svg>` document with no external references; pasting it into a new file produces a renderable SVG.

#### Scenario: No-JS user can still copy

- **WHEN** a user with JavaScript disabled visits `/brand`
- **THEN** each tile shows a `<details>` block whose summary opens to a `<pre>` containing the standalone SVG markup, selectable for manual copy.

### Requirement: /brand is Noindex

The literal string `'/brand'` MUST be present in the `NOINDEX_ROUTES` tuple declared in `src/lib/indexation.ts` after this change archives (the constant is `as const` so this is a source-edit, not a runtime concat). The single-source list is established by `site-indexation`. The `/brand` route MUST emit `<meta name="robots" content="noindex, nofollow">` and MUST NOT appear in the sitemap.

#### Scenario: /brand excluded from sitemap

- **WHEN** the built `dist/sitemap-0.xml` is parsed
- **THEN** no `<loc>` element references `/brand`.

#### Scenario: /brand carries noindex meta

- **WHEN** the built `dist/brand/index.html` is inspected
- **THEN** the head contains `<meta name="robots" content="noindex, nofollow">`.

### Requirement: /brand Performance Exception

The `/brand` route MAY ship inline SVG payload exceeding the marketing-route content budget. The Lighthouse CI per-URL exception MUST be expressed as an additional `assertMatrix` entry (per the `style-system` Lighthouse CI Performance Gate requirement) with `matchingUrlPattern: "https?://[^/]+/brand/?$"` and assertions that relax `categories:performance` to `minScore: 0.8` while keeping `categories:accessibility`, `categories:seo`, and `categories:best-practices` at `minScore: 0.95`. The exception MUST be documented inline in `lighthouserc.json` with a comment citing this requirement. The marketing-route thresholds defined in the redesign's Lighthouse Requirement MUST NOT be lowered by this exception; only the `/brand`-specific entry relaxes.

#### Scenario: /brand passes relaxed perf

- **WHEN** Lighthouse CI runs against `/brand`
- **THEN** the performance category score is ≥ 0.8 and a11y/SEO/best-practices are ≥ 0.95.
