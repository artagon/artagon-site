## ADDED Requirements

### Requirement: Locale Registry Single Source of Truth

The system SHALL maintain `src/i18n/locales.ts` as the single source of truth for the configured locale set. The module MUST export `LOCALES` (`ReadonlyArray<Locale>`), `DEFAULT_LOCALE` (`Locale`), and the `Locale` type. Every other consumer (astro.config.ts, content.config.ts, sitemap config, SeoTags, BaseLayout, every lint gate that mentions a locale) MUST import from this module — no duplicated literal arrays anywhere in the codebase.

#### Scenario: Single import target

- **WHEN** any file in src/, public/, or scripts/ references a locale string ("en", "es", etc.) outside `src/i18n/locales.ts`
- **THEN** the file MUST import the value via `import { LOCALES, DEFAULT_LOCALE } from "src/i18n/locales"` (or its relative equivalent)

#### Scenario: Locale type narrows correctly

- **WHEN** TypeScript code declares a variable of type `Locale`
- **THEN** the type MUST be a string-literal union of the LOCALES array values, exhaustively narrowing in switch / discriminated-union contexts

#### Scenario: Drift gate catches duplicated literals

- **WHEN** `lint-locale-registry-sync` regression test runs
- **THEN** the test MUST scan src/ + public/ for string literals matching any LOCALES entry that don't import from `src/i18n/locales.ts`, AND fail with file:line of any duplicate

### Requirement: UI Strings Layer with Build-Time Helper

The system SHALL externalize all user-facing UI strings (navigation, footer, ARIA labels, error messages, CTAs) into per-locale JSON files at `src/i18n/{locale}/strings.json`. A build-time helper `t(locale: Locale, key: string): string` MUST resolve the key against `{locale}/strings.json` with fallback to `en/strings.json` if missing. The helper MUST route through `src/lib/charset.ts` (extending the existing `safeJsonLd` chokepoint).

#### Scenario: Helper resolves key for default locale

- **WHEN** `t("en", "nav.platform")` is called and `en/strings.json` contains `"nav.platform": "Platform"`
- **THEN** the helper returns the string `"Platform"`

#### Scenario: Helper falls back to default locale on miss

- **WHEN** `t("es", "nav.bridge")` is called, `es/strings.json` does NOT contain key `nav.bridge`, but `en/strings.json` does
- **THEN** the helper returns the English value AND emits a build-time warning (NOT an error — warnings allow partial-locale rollout, but visible enough that translators see them)

#### Scenario: Helper escapes safely via charset chokepoint

- **WHEN** `t()` returns a string containing characters with special HTML / JSON meaning (`<`, `>`, `&`, `"`)
- **THEN** the value passes through `src/lib/charset.ts`'s safe-escape pipeline before being inlined into the rendered HTML, preventing XSS / JSON-LD injection

### Requirement: Per-Locale Content-Collection Directory Structure

Content collections (`src/content/{pages,writing,authors}/`) SHALL organize MDX files in per-locale subdirectories: `src/content/{collection}/{locale}/{slug}.mdx`. Default-locale (English) MDX files MUST migrate into the `en/` subdirectory; non-default locales add files alongside as separate proposals.

#### Scenario: English MDX files live under en/ subdirectory

- **WHEN** the build runs after migration
- **THEN** every `.mdx` file in `src/content/pages/`, `src/content/writing/`, `src/content/authors/` resides under a `{locale}/` subdirectory (no MDX files exist at the top level of any collection directory)

#### Scenario: Schema enforces locale field

- **WHEN** a content-collection schema is loaded by Astro
- **THEN** the schema MUST include `locale: z.enum(LOCALES).default(DEFAULT_LOCALE)` as a required (defaulted) field

#### Scenario: Cross-locale slug lookups are unambiguous

- **WHEN** code performs a content-collection lookup by ID
- **THEN** the ID resolves with locale prefix (e.g., `en/vision`, `es/vision`) — the same slug across locales does NOT collide

### Requirement: Data-Module Structure-String Split

Each `src/data/*.ts` module SHALL split into (a) a TypeScript shape file (`src/data/{name}.ts`) containing only structure — interfaces, IDs, asset paths, type unions; AND (b) a per-locale JSON file (`src/i18n/{locale}/data/{name}.json`) containing only translatable strings keyed by structural ID. A helper `localizeData<T>(structure: T, locale: Locale): T` MUST compose the two at build time.

#### Scenario: Structure file contains no user-facing strings

- **WHEN** `src/data/{name}.ts` is loaded
- **THEN** the module MUST NOT contain string literals that are user-facing UI text (a regression gate enforces this — specifically, no string literal longer than 24 characters that's not an ID, asset path, or class name)

#### Scenario: localizeData composes structure + strings

- **WHEN** `localizeData(STRUCTURE, "en")` is called for a data module
- **THEN** the helper returns a fresh object (no shared mutable state) where every string-keyed lookup against `en/data/{name}.json` is resolved; the returned shape is type-equivalent to the structure

#### Scenario: localizeData missing-key behavior matches t() helper

- **WHEN** `localizeData(STRUCTURE, "es")` is called and `es/data/{name}.json` is missing a key
- **THEN** the helper falls back to `en/data/{name}.json` AND emits a build-time warning (consistent with `t()` helper behavior)

### Requirement: Astro Built-in i18n Routing

`astro.config.ts` SHALL configure Astro 6 built-in i18n: `i18n: { locales: LOCALES, defaultLocale: DEFAULT_LOCALE, routing: { prefixDefaultLocale: false } }`. NO third-party i18n library (`astro-i18next`, `@astrojs/i18n`, etc.) SHALL be added — built-in routing is sufficient.

#### Scenario: Default locale routes have no prefix

- **WHEN** the build emits English routes
- **THEN** the canonical English URL for any route is `/{path}` (no `/en/` prefix). Existing routes (`/platform`, `/faq`, `/writing/welcome`, etc.) keep their unprefixed form post-i18n.

#### Scenario: Non-default locale routes are prefixed

- **WHEN** the build emits a non-English route (e.g., Spanish)
- **THEN** the canonical URL is `/{locale}/{path}` (e.g., `/es/platform`)

#### Scenario: getAbsoluteLocaleUrl returns correct per-locale URL

- **WHEN** code calls Astro's `getAbsoluteLocaleUrl(locale, pathname)`
- **THEN** the return value matches the canonical URL emitted by the build for that locale + path combination

### Requirement: Locale-Strings Sync Regression Gate

The system SHALL enforce that every key present in `src/i18n/{DEFAULT_LOCALE}/strings.json` exists in EVERY other-locale `src/i18n/{locale}/strings.json` file. The same rule applies to `src/i18n/{locale}/data/{name}.json` files. A `lint-locale-strings-sync` vitest gate MUST fail the build with a list of missing-key paths if any locale falls behind the default-locale key set.

#### Scenario: Missing key in non-default locale fails the gate

- **WHEN** `en/strings.json` contains key `cta.new-feature` but `es/strings.json` does NOT
- **THEN** `lint-locale-strings-sync` fails with output `es/strings.json — missing key "cta.new-feature"`

#### Scenario: Extra key in non-default locale is permitted

- **WHEN** `es/strings.json` contains a key NOT present in `en/strings.json` (e.g., a Spanish-only string)
- **THEN** the gate passes for that key (one-way completeness — extras are allowed because they may serve future English additions)

#### Scenario: TODO_TRANSLATE placeholder values pass

- **WHEN** a non-default locale's value for a key is the literal string `TODO_TRANSLATE` (or matching placeholder pattern documented in the gate)
- **THEN** the gate emits a warning (not an error) so the partial-locale rollout proceeds

### Requirement: Hreflang Coverage Regression Gate

Every built `.html` page SHALL ship a `<link rel="alternate" hreflang="...">` tag for every configured locale, AND a `<link rel="alternate" hreflang="x-default">` tag pointing at the default-locale URL. A `lint-hreflang-coverage` vitest gate MUST fail the build if any built page is missing hreflang coverage.

#### Scenario: Each built page has hreflang per locale

- **WHEN** the gate scans `.build/dist/**/*.html`
- **THEN** every page contains exactly N+1 hreflang link tags where N = number of configured locales (one per locale + one `x-default`)

#### Scenario: Hreflang URL points at the correct per-locale variant

- **WHEN** the gate inspects `<link rel="alternate" hreflang="es" href="...">` on the built `/platform` page
- **THEN** the href matches Astro's `getAbsoluteLocaleUrl("es", "/platform")` output (`https://artagon.com/es/platform`)

#### Scenario: x-default points at default locale URL

- **WHEN** any built page emits `<link rel="alternate" hreflang="x-default">`
- **THEN** the href is the default-locale (English) URL for that route — `https://artagon.com/{path}`, no prefix

### Requirement: Locale-Aware Canonical URL Regression Gate

Every per-locale page SHALL ship a `<link rel="canonical" href="...">` matching its own locale's URL (NOT the default-locale URL). A `lint-locale-canonical` vitest gate MUST fail if any non-default-locale page's canonical points outside its own locale.

#### Scenario: Spanish page canonical points at Spanish URL

- **WHEN** the gate inspects `.build/dist/es/platform/index.html`
- **THEN** `<link rel="canonical" href="...">` resolves to `https://artagon.com/es/platform`, NOT `https://artagon.com/platform`

#### Scenario: English page canonical stays unchanged

- **WHEN** the gate inspects `.build/dist/platform/index.html`
- **THEN** `<link rel="canonical">` resolves to `https://artagon.com/platform` (no `/en/` prefix per `prefixDefaultLocale: false`)

### Requirement: html lang Attribute Regression Gate

Every built `.html` page SHALL ship `<html lang="...">` matching the rendered route's locale. A `lint-html-lang` vitest gate MUST fail if any built page's `<html lang>` value diverges from the route's locale.

#### Scenario: English route renders lang="en"

- **WHEN** the gate inspects `.build/dist/index.html`
- **THEN** the `<html>` element MUST have `lang="en"`

#### Scenario: Spanish route renders lang="es"

- **WHEN** the gate inspects `.build/dist/es/index.html`
- **THEN** the `<html>` element MUST have `lang="es"` (NOT `lang="en"`)

#### Scenario: Locale codes match BCP 47 normalization

- **WHEN** a locale identifier in LOCALES is `"es-MX"` (region-specific)
- **THEN** the corresponding `<html lang>` value MUST match exactly (`lang="es-MX"`), NOT a fallback (`lang="es"`)

### Requirement: Per-Locale PWA Manifest

The build SHALL emit one PWA manifest file per locale. The default-locale manifest MUST ship at `/site.webmanifest` (canonical existing path); non-default locales MUST ship at `/site.{locale}.webmanifest`. The 11-icon array SHALL be shared across locales; only `name`, `short_name`, and `description` translate.

#### Scenario: Default-locale manifest path unchanged

- **WHEN** the build emits the English manifest
- **THEN** the file ships at `/site.webmanifest` (NOT `/site.en.webmanifest`) — preserves the existing `<link rel="manifest" href="/site.webmanifest">` reference, no migration needed for English consumers

#### Scenario: Non-default locale manifest at predictable path

- **WHEN** the build emits a non-English manifest for locale `es`
- **THEN** the file ships at `/site.es.webmanifest` and contains `name`, `short_name`, `description` translated from `es/strings.json` keys `pwa.name`, `pwa.short-name`, `pwa.description`

#### Scenario: Per-locale manifest link reference

- **WHEN** the build renders a Spanish-locale page
- **THEN** the page's `<head>` contains `<link rel="manifest" href="/site.es.webmanifest">` (not the default `/site.webmanifest`)

### Requirement: i18n Pipeline Implementation Milestones

Implementation SHALL proceed in 5 sequential milestones, each landing as a separate commit. After each milestone's commit, an adversarial multi-agent review MUST run before the next milestone begins. The minimum-viable review tier is `code-reviewer + silent-failure-hunter + type-design-analyzer` (CLAUDE.md "Review workflow" Tier 1); milestone-specific lenses are documented in the change's `tasks.md`.

#### Scenario: Each milestone lands as one commit

- **WHEN** an implementation milestone (M1-M5) completes
- **THEN** exactly one commit lands with body referencing the milestone tag (`Closes <milestone-tag>`)

#### Scenario: Adversarial review precedes next milestone

- **WHEN** milestone N+1 implementation begins
- **THEN** milestone N's commit MUST have an associated multi-agent-review report stored in `openspec/changes/externalize-strings-and-add-i18n/reviews/m{N}.md`

#### Scenario: M5 receives full-Tier review

- **WHEN** milestone M5 (first non-English locale port) completes
- **THEN** the adversarial review MUST include CLAUDE.md "Review workflow" Tier 1 + Tier 2 + Architectural-trio (security-architect, modularity-and-boundaries, type-system-architect) — the broadest coverage of any milestone, because M5 is the first end-to-end pipeline test
