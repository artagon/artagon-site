## ADDED Requirements

### Requirement: Sitewide Organization and WebSite JSON-LD

`BaseLayout.astro` MUST emit a `schema.org/Organization` JSON-LD block with `name`, `url`, `logo` (absolute URL), and `sameAs[]` (GitHub, X, etc.) on every route. It MUST also emit a `WebSite` block with `url` and `name`. The `WebSite` block MUST NOT include `potentialAction` SearchAction while `/search` is `noindex`; SearchAction MAY be added in a follow-up change once `/search` is indexable.

#### Scenario: Organization JSON-LD validates

- **WHEN** `scripts/validate-structured-data.mjs` parses any built route in `dist/`
- **THEN** an `Organization` block is present and contains `name`, `url`, `logo` (https absolute), and `sameAs[]` non-empty.

#### Scenario: WebSite has no SearchAction

- **WHEN** the validator parses a built route's WebSite JSON-LD
- **THEN** the block does NOT contain a `potentialAction` field.

### Requirement: Article and BreadcrumbList on Writing Posts

Every `/writing/[slug]` route MUST emit a `schema.org/Article` JSON-LD block with `headline`, `description`, `author` (Person), `datePublished` (ISO), `dateModified?` (ISO), `mainEntityOfPage` (canonical URL), and `publisher` (Organization with `name` and `logo`, resolved from the sitewide Organization block). The `image` field is REQUIRED for News / Top Stories rich-result eligibility; if a post lacks `cover` frontmatter the build MUST emit a warning naming the post and the eligibility loss. It MUST also emit a `BreadcrumbList` with two items: Writing → article title.

#### Scenario: Article datePublished is ISO

- **WHEN** the validator parses a built `/writing/[slug]` route
- **THEN** `Article.datePublished` matches `^\d{4}-\d{2}-\d{2}` and is ≤ today.

#### Scenario: Publisher is present and resolved

- **WHEN** the validator parses a built `/writing/[slug]` route
- **THEN** `Article.publisher` contains a `name` matching the sitewide Organization `name` and a `logo` matching the sitewide Organization `logo` URL.

#### Scenario: Missing cover image emits build warning

- **WHEN** a writing post lacks `cover` frontmatter
- **THEN** `scripts/validate-structured-data.mjs` emits a non-fatal warning naming the slug and "Top Stories rich-result ineligibility"; the build does not fail.

### Requirement: DefinedTerm on Standards Page

The `/standards` route MUST emit a `schema.org/DefinedTermSet` containing one `DefinedTerm` per registry entry. Each `DefinedTerm` MUST include `@id` (matching the entry `id`), `name`, `description` (from `longSummary`), and `url` (absolute).

#### Scenario: DefinedTerm count matches registry

- **WHEN** the validator parses the built `/standards` route
- **THEN** the `hasDefinedTerm` array length equals the registry entry count.

### Requirement: JSON-LD Safety and Script-Tag Escape

JSON-LD blocks MUST be emitted via the `safeJsonLd` helper at `src/lib/charset.ts` (pre-pt405 cited `JsonLd.astro` for the planned dedicated component; the implementation shifted to inline `set:html={safeJsonLd(...)}` per proposal.md:75 — `JsonLd.astro` does not exist, the safeJsonLd helper is the canonical SSoT, and `set:html` IS used for JSON-LD specifically because the directive is needed for the JSON-stringify embed; the ast-grep `no-set-html-directive` rule has an explicit exception for safeJsonLd output via the per-line allow-list pragma — see `rules/security/no-set-html-directive.yml` `note:` block) using `JSON.stringify` and Astro's safe interpolation inside `<script type="application/ld+json">`.

**Escape strategy.** HTML entities (`&lt;`, `&gt;`, `&amp;`) MUST NOT be used inside `<script type="application/ld+json">` because the script body is parsed as JSON, not HTML — JSON parsers do not decode HTML entities, so `{"name":"&lt;script&gt;"}` parses with the entity literal in the value, not `<script>`. The correct strategy is **JSON unicode escapes**: after `JSON.stringify` returns, replace `<` with `<`, `>` with `>`, `&` with `&`, ` ` (line separator) and ` ` (paragraph separator) with their escape forms. These escapes preserve the JSON semantics of every value while preventing the substring `</script>` (or `<!--`, `<script`) from appearing in the rendered bytes — the HTML parser sees `</script>` as 14 literal characters, never as a tag. This is the pattern used by `serialize-javascript`, Next.js, Astro's own JSON-LD helpers, and OWASP's recommendation.

`scripts/validate-structured-data.mjs` MUST assert that no built HTML in `.build/dist/` contains the raw substrings `</script`, `<!--`, or `<script` (anywhere — case-insensitive) inside any `<script type="application/ld+json">` block. The validator MUST also assert the JSON inside each ld+json block parses successfully via `JSON.parse`.

#### Scenario: ast-grep passes

- **WHEN** `npm run lint:sg:ci` runs against the new components
- **THEN** no `no-set-html-directive` violations are reported.

#### Scenario: Crafted MDX cannot break out of ld+json

- **WHEN** an MDX author crafts an Article `headline` containing `</script><img src=x onerror=alert(1)>`
- **THEN** the built `.build/dist/writing/<slug>/index.html` contains `</script><img src=x onerror=alert(1)>` (unicode-escaped JSON) inside the ld+json block; `scripts/validate-structured-data.mjs` confirms the raw bytes `</script>`, `<!--`, `<script` are absent; the JSON inside the block parses via `JSON.parse` and the `headline` value round-trips back to the original `</script><img src=x onerror=alert(1)>` string (ld+json consumers receive the verbatim text).

### Requirement: JSON-LD Aggregate Size Budget

The aggregate size of all JSON-LD blocks per built route MUST NOT exceed 8 KB uncompressed. `JSON.stringify` MUST be invoked without indent argument (`JSON.stringify(data)`, not `JSON.stringify(data, null, 2)`). `scripts/validate-structured-data.mjs` MUST fail the build if any route exceeds the ceiling.

#### Scenario: /standards under budget

- **WHEN** the validator measures aggregate ld+json bytes on the built `/standards` route (DefinedTermSet × 8 + Organization + WebSite)
- **THEN** the total is ≤ 8192 bytes uncompressed and the build passes.

### Requirement: Absolute URLs in Structured Data

Every URL in any JSON-LD block (logo, image, mainEntityOfPage, sameAs, DefinedTerm.url) MUST be absolute (`https://...`). Relative URLs are forbidden.

#### Scenario: Validator catches relative URL

- **WHEN** a JSON-LD block contains `"logo": "/assets/logo.svg"`
- **THEN** `scripts/validate-structured-data.mjs` exits non-zero with the offending field.
