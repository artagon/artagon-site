## ADDED Requirements

### Requirement: Single Source for Non-Indexable Routes

The list of non-indexable routes MUST be defined exactly once in `src/lib/indexation.ts` as a `NOINDEX_ROUTES` constant (typed `as const` array of strings). The sitemap filter (`astro.config.mjs`), the `BaseLayout.astro` `indexable` prop default, the `public/robots.txt` generator, and `scripts/validate-indexation.mjs` MUST all import or reference this single source. Build MUST fail if any consumer hand-rolls a divergent list.

#### Scenario: All four consumers reference the same source

- **WHEN** a contributor adds `/admin` to `NOINDEX_ROUTES` in `src/lib/indexation.ts`
- **THEN** the next build excludes `/admin` from the sitemap, `BaseLayout.astro` emits `noindex` meta on `/admin`, `robots.txt` lists `/admin` in `Disallow`, and `validate-indexation.mjs` confirms parity.

### Requirement: Sitemap Regeneration on Build

`@astrojs/sitemap` MUST regenerate `sitemap-index.xml` (and the underlying `sitemap-N.xml` files) on every `astro build`. The sitemap MUST exclude every route in `NOINDEX_ROUTES` and any `/_drafts/*` route. The `<lastmod>` value for each entry MUST be sourced from MDX frontmatter (`updated` if present, else `published`) via the `serialize` hook passed to `@astrojs/sitemap`; CI file mtime is forbidden as a `lastmod` source.

#### Scenario: Marketing routes are listed

- **WHEN** the site is built
- **THEN** `dist/sitemap-0.xml` contains entries for `/`, `/platform`, `/use-cases`, `/standards`, `/roadmap`, `/writing`, and each `/writing/[slug]`.

#### Scenario: App-shell routes are excluded

- **WHEN** the built sitemap is parsed
- **THEN** no `<loc>` element references any route listed in `NOINDEX_ROUTES`.

#### Scenario: lastmod sourced from frontmatter, not mtime

- **WHEN** a writing post has `published: "2026-04-01"` and `updated: "2026-04-15"` in its MDX frontmatter
- **THEN** the corresponding `<lastmod>` in `sitemap-0.xml` is `2026-04-15`, regardless of CI checkout time.

#### Scenario: validate-indexation enforces lastmod parity

- **WHEN** `scripts/validate-indexation.mjs` runs against `dist/sitemap-0.xml`
- **THEN** every `<lastmod>` value matches the most recent of `updated`/`published` from the corresponding MDX frontmatter; mismatches fail the build.

### Requirement: Noindex on App-Shell Routes

The routes `/console`, `/search`, `/play`, and `/404` MUST emit `<meta name="robots" content="noindex, nofollow">`. Marketing routes MUST NOT emit a noindex directive.

#### Scenario: Marketing route is indexable

- **WHEN** the built `/platform` HTML is inspected
- **THEN** there is no `<meta name="robots" content="noindex...">` and `scripts/validate-indexation.mjs` records the route as indexable.

#### Scenario: Console is noindex

- **WHEN** the built `/console` HTML is inspected
- **THEN** the meta robots tag contains both `noindex` and `nofollow`.

### Requirement: robots.txt

`public/robots.txt` MUST exist and disallow no marketing routes; it MUST disallow the four app-shell routes (`/console`, `/search`, `/play`) and reference the sitemap via `Sitemap: https://artagon.com/sitemap-index.xml`. (The `/404` route is implicitly excluded from indexing by being a 404.)

#### Scenario: Sitemap line is present

- **WHEN** `public/robots.txt` is parsed
- **THEN** it contains exactly one `Sitemap:` line resolving to `https://artagon.com/sitemap-index.xml`.

### Requirement: RSS link rel=alternate

`BaseLayout.astro` MUST emit `<link rel="alternate" type="application/rss+xml" href="/writing/feed.xml">` on every marketing route.

#### Scenario: Feed discoverable from home

- **WHEN** the home route HTML is inspected
- **THEN** the head contains the RSS alternate link with the feed URL.

### Requirement: Trailing-slash Policy

`astro.config.mjs` MUST keep `trailingSlash: 'never'`. All canonical URLs in metadata, sitemap, and structured data MUST omit trailing slashes (except for the root `/`).

#### Scenario: Canonical omits trailing slash

- **WHEN** the `/platform` route is built
- **THEN** the `<link rel="canonical">` is `https://artagon.com/platform` (no trailing slash).
