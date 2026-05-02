## ADDED Requirements

### Requirement: Marketing Route Inventory

The site SHALL ship the following marketing routes, each authored as MDX under `src/content/pages/`:

- `/` (home)
- `/platform`
- `/use-cases`
- `/standards`
- `/roadmap`
- `/writing` (index) and `/writing/[slug]` (detail) and `/writing/feed.xml`

#### Scenario: Home route renders from MDX

- **WHEN** an editor updates `src/content/pages/home.mdx`
- **THEN** the changes are reflected on `/` after rebuild without modifying any `.astro` template logic.

#### Scenario: Writing detail route renders from collection

- **WHEN** a new file is added under `src/content/pages/writing/` with valid frontmatter
- **THEN** it is reachable at `/writing/[slug]` and listed on `/writing` index sorted by `published` desc.

#### Scenario: Writing RSS feed emits

- **WHEN** the site builds
- **THEN** `/writing/feed.xml` is produced via `@astrojs/rss` containing one `<item>` per non-draft post in `src/content/pages/writing/`.

### Requirement: Per-route Frontmatter Contract

Each marketing-route MDX file MUST declare frontmatter `eyebrow`, `headline`, `lede`, `description` (80–160 chars), and a `ctas[]` array (each with `label` and `href`).

#### Scenario: Missing frontmatter fails build

- **WHEN** an editor commits an MDX file without the `description` field
- **THEN** `astro build` fails with a Zod validation error citing the missing field.

### Requirement: Canonical Taglines Single Source

The short tagline and the triad tagline MUST be sourced exclusively from `src/content/taglines.json` and consumed by hero, footer, and `<meta name="description">` via component lookup; no MDX or `.astro` file SHALL hardcode either string.

#### Scenario: Lint catches duplicate tagline

- **WHEN** a contributor pastes the short-tagline string into a `.mdx` file outside the canonical source
- **THEN** `scripts/lint-taglines.mjs` exits non-zero with the offending file:line and a remediation hint.

### Requirement: Code Examples per Platform Pillar

The `/platform` route MUST render exactly one code example per pillar (Identity, Credentials, Authorization). Examples are highlighted at build time via Shiki with a token-derived theme; no client-side syntax-highlighter SHALL be loaded.

#### Scenario: Pillar without example fails review

- **WHEN** a `platform.mdx` revision removes the `<CodeBlock>` for the Authorization pillar
- **THEN** `tests/platform.spec.ts` fails the assertion that `[data-pillar='authorization'] pre code` is visible on the rendered page.

### Requirement: Latest Writing Module on Home

The home route SHALL surface a "latest writing" strip referencing the most recent non-draft post in `src/content/pages/writing/`. If the collection is empty, the strip MUST be hidden (no placeholder copy).

#### Scenario: Empty writing collection hides the strip

- **WHEN** `src/content/pages/writing/` contains zero non-draft entries
- **THEN** the home route renders no "Latest writing" section and the smoke test asserts the section is absent.

## MODIFIED Requirements

### Requirement: Content Collections

Long-form content pages SHALL be implemented using Astro Content Collections to ensure separation of content and presentation. The `pages` collection extends to cover `home`, `platform`, `use-cases`, `standards`, `roadmap`, `vision`, and a sub-collection `pages/writing` for blog/long-form posts. Authors live in a separate `authors` collection.

#### Scenario: Vision Page Content

- **WHEN** a developer edits `src/content/pages/vision.mdx`
- **THEN** the changes are reflected on the `/vision` route without modifying the page template logic.

#### Scenario: Marketing route content

- **WHEN** a developer edits `src/content/pages/platform.mdx`
- **THEN** the changes render on `/platform` without modifying `src/pages/platform.astro` (which only assembles components and reads the entry).

### Requirement: Type-Safe Content Schemas

All content collections MUST have a defined Zod schema to validate frontmatter metadata. The `pages` schema MUST require `title`, `description`, `eyebrow`, `headline`, `lede`, and `ctas[]`. The `pages/writing` schema MUST additionally require `published` (ISO date), `tags[]`, and accept optional `updated`, `cover`, `accent`, `repo`. The `authors` schema MUST require `name`, `slug`, and accept optional `bio`, `avatar`, `links[]`.

#### Scenario: Missing Metadata

- **WHEN** a content file is created without required frontmatter (e.g., `title`, `description`)
- **THEN** the build fails with a validation error.

#### Scenario: Missing writing-specific frontmatter

- **WHEN** a file under `src/content/pages/writing/` lacks a `published` ISO date
- **THEN** the build fails with a Zod validation error.
