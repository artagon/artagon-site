## ADDED Requirements

### Requirement: Favicon Set

The site MUST ship a complete favicon set under `public/`: `favicon.ico` (multi-size), `favicon.svg` (themed via `currentColor`), `apple-touch-icon.png` (180 × 180), `icon-192.png`, and `icon-512.png`. These MUST be referenced from `BaseLayout.astro`.

#### Scenario: All favicons load

- **WHEN** the home route is loaded
- **THEN** every favicon link in the head returns 200 (no 404s in the network tab).

### Requirement: theme-color Coordinated with Theme

`BaseLayout.astro` MUST emit two `<meta name="theme-color">` tags, one per `prefers-color-scheme` value, with values sourced from `src/data/brand-colors.ts` so the OS chrome (PWA, mobile address bar) matches `twilight` or `midnight`.

#### Scenario: Light scheme has its own theme-color

- **WHEN** the head is inspected
- **THEN** there are exactly two theme-color meta tags, each with a `media="(prefers-color-scheme: ...)"` attribute, and both colors are sourced from `brand-colors.ts`.

### Requirement: Web Manifest

`public/site.webmanifest` MUST be generated from `src/data/brand-colors.ts` via `scripts/generate-manifest.mjs` (run pre-build) and reference the 192 / 512 icons.

#### Scenario: Manifest is auto-generated

- **WHEN** `npm run build` runs
- **THEN** `public/site.webmanifest` is written before `astro build` starts and includes `name`, `short_name`, `theme_color`, `background_color`, `start_url: "/"`, and the two icons.

### Requirement: Per-slug Open Graph Images

Each marketing route MUST emit an absolute-URL Open Graph image. Per-slug custom images take precedence; routes without a custom image fall back to a generated default produced by `scripts/generate-og-images.mjs` (satori-based) at build time.

#### Scenario: Writing post has custom OG

- **WHEN** a writing post declares `cover: "./assets/welcome-cover.png"` in frontmatter
- **THEN** the built page's `og:image` resolves to the absolute URL of that asset.

#### Scenario: Route without custom OG falls back

- **WHEN** the `/use-cases` route does not declare a `cover`
- **THEN** the built `og:image` resolves to a generated `https://artagon.com/og/use-cases.png` produced from the satori template.

### Requirement: Inline-Wordmark Ban

The Artagon wordmark SVG MUST appear inline only inside `Header.astro` and `Footer.astro` (pre-pt405 cited `Nav.astro` for the header surface; `Nav.astro` was consolidated into `Header.astro` per proposal.md:75). Any other inline use is forbidden; alternatives are `<img src="/assets/brand/wordmark.svg">` or a referenced asset.

#### Scenario: Lint catches inline wordmark elsewhere

- **WHEN** a contributor inlines the wordmark SVG inside a marketing route MDX
- **THEN** `scripts/lint-brand.mjs` (or `rules/security/no-inline-wordmark.yaml`) exits non-zero citing the offending file.
