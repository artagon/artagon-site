## MODIFIED Requirements

### Requirement: Type-Safe Content Schemas

All content collections MUST have a defined Zod schema to validate frontmatter metadata. Each schema MUST include a `locale: z.enum(LOCALES).default(DEFAULT_LOCALE)` field that ties the entry to the locale registry single source of truth (`src/i18n/locales.ts`). Content files MUST live in per-locale subdirectories under their collection (`src/content/{collection}/{locale}/{slug}.mdx`).

#### Scenario: Missing Metadata

- **WHEN** a content file is created without required frontmatter (e.g., `title`, `description`)
- **THEN** the build fails with a validation error.

#### Scenario: Missing locale field

- **WHEN** a content file's frontmatter omits the `locale` field AND lives in a directory not matching `{collection}/{locale}/`
- **THEN** the build fails with a Zod validation error pointing at the missing locale value

#### Scenario: Locale field value matches directory placement

- **WHEN** a content file is at `src/content/pages/en/vision.mdx`
- **THEN** the frontmatter `locale` field MUST be `"en"` (or the field is omitted and defaults to `"en"` via the schema's `.default(DEFAULT_LOCALE)`); a mismatch (e.g., file at `pages/en/vision.mdx` with frontmatter `locale: "es"`) MUST fail a build-time consistency check

#### Scenario: Default-locale subdirectory migration

- **WHEN** the i18n migration completes (M3)
- **THEN** every existing English MDX file under `src/content/{pages,writing,authors}/` resides under that collection's `en/` subdirectory; NO MDX files exist at the top level of any content-collection directory
