## Context

The site ships ~1,300 user-facing strings across 4 surface classes (per the iter-174 audit):

| Surface                                                               | Files                                                                                   | Strings                                                                                                                  | Complexity                          |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| MDX content collections (`src/content/{pages,writing,authors}/*.mdx`) | 6 pages + 3 posts + 1 author                                                            | ~35 frontmatter strings + ~970 lines of body prose                                                                       | Medium (Markdown-aware translation) |
| TypeScript data modules (`src/data/*.ts`)                             | 11 files                                                                                | ~1,200 strings (faq.ts 21 Q&A, glossary.ts 100+ terms, pillars/use-cases/roadmap/standards/bridge/trust-chain ~100 each) | Low (mechanical extraction)         |
| Astro components + ARIA labels                                        | Header / Footer / FaqSearch / RoadmapTimeline / SeoTags / SeoIcons / 404 / writing slug | ~40 nav/CTA/title labels + ~20 ARIA labels                                                                               | Very Low (fixed labels)             |
| Centralized resources                                                 | `src/content/taglines.json`, `public/site.webmanifest`, `public/security.txt`           | 5 + 3 + 4                                                                                                                | Already centralized for taglines    |

The project has already begun externalization: `src/content/taglines.json` carries the 5 canonical brand-line strings; `scripts/lint-taglines.mjs` enforces no-duplicate. The CLAUDE.md memory note "future per-language bundles will load through a single safe-escape chokepoint" confirms the architectural intent. The chokepoint is `src/lib/charset.ts` (safeJsonLd helper today).

The pt121→pt172 sweep established 29 permanent regression gates and a "dual-source content must stay in sync" pattern (pt165 Tweaks pre-paint allow-list, pt172 security.txt root vs `.well-known`). Multi-locale UI strings introduce another N-source-sync dimension that the same gating pattern can lock.

Astro 6's built-in i18n (`i18n: { locales, defaultLocale, routing }`) is sufficient — no third-party library needed (the Astro 6 research agent confirmed `astro-i18next` and `@astrojs/i18n` are heavyweight for this project's scope). `@astrojs/sitemap` already installed; its `i18n` config auto-generates `<xhtml:link rel="alternate" hreflang>` for every URL pair.

Constraints:

- Static-only build output (no SSR, no runtime translation server).
- The local-dev `ignore-scripts=true` user-env constraint (pt163) silently skips postbuild gates; CI is the source of truth. Every i18n CI step must independently fail-loud on misconfiguration.
- The 7-gate SEO-pipeline contract (pt146→pt154) MUST continue passing post-i18n. The new locale-aware canonical / og / sitemap / JSON-LD wiring lands inside SeoTags; existing gates auto-extend if the contract holds.
- WCAG 3.1.1 (Language of Page) requires `<html lang="...">` to match content. WCAG 3.1.2 (Language of Parts) requires per-element `lang` attributes when prose changes language mid-page (out of scope for this proposal — current content is English-only with occasional foreign-language proper nouns that don't need lang attribution per WCAG techniques).

Stakeholders:

- Content authors editing `.mdx` files — their workflow can't get worse (per-locale directory must be discoverable, not buried)
- Translation contributors — JSON files MUST be edit-friendly (well-commented, key paths predictable, no nested type unions)
- Search engines (Google primarily) — hreflang + sitemap-with-alternates + per-locale canonicals must form a consistent crawler signal
- AT users (screen readers) — per-locale `<html lang>` + `aria-label` translations must compose cleanly

## Goals / Non-Goals

**Goals:**

- Pipeline-only proposal: lay the architectural rails so a future "add Spanish locale" / "add French locale" proposal is purely content-translation work, not architecture.
- All ~1,300 user-facing strings externalized into a typed-key registry that survives schema evolution (add a string → add to `en/strings.json` → optional in other-locale files; missing translations fall back to English at runtime).
- Astro 6 built-in i18n (no third-party dep). `prefixDefaultLocale: false` so English routes stay at `/` (zero-impact migration; existing canonicals + sitemap entries unchanged for English).
- Per-locale content-collection directories (`src/content/{collection}/{locale}/file.mdx`). Default locale (English) MDX migrates into `en/` subdirectory; other locales add files as separate proposals.
- Existing 29 permanent regression gates continue passing. 4 new gates lock the i18n contract: locale-strings-sync, hreflang-coverage, locale-canonical, html-lang.
- Adversarial multi-agent reviews after each of 5 milestones (see Decisions §"Milestone Structure") using `pr-review-toolkit` lenses (code-reviewer + silent-failure-hunter + type-design-analyzer + comment-analyzer + pr-test-analyzer at minimum; locale-specific reviews add browser-engine + RTL-readiness in later phases).

**Non-Goals:**

- Adding any non-English locale's content. The pipeline lands in this proposal; the first content port is a separate `add-{locale}-content` proposal.
- Right-to-left (RTL) layout support. Out of scope until an RTL locale is proposed.
- Pluralization / date / number formatting (ICU MessageFormat). Current strings have zero plural-form patterns; speculative complexity deferred.
- Per-locale OG image variants. Image-template pipeline (`make-og-from-template.sh`) is locale-orthogonal; per-locale OG can land later without touching i18n architecture.
- Translation-memory / CAT-tool integration (Lokalise / Phrase / Crowdin). Direct JSON edit is sufficient for the current scope.
- Translating Organization / Service / WebSite JSON-LD schemas. Per Google's Article rich-result rules, these stay canonical English; only Article `headline` / `description` translates per-locale.
- Translating the `author` Person JSON-LD field. Person names are proper nouns; "Giedrius Trumpickas" stays canonical regardless of locale.
- Migrating the existing 22-route sitemap structure. Sitemap stays organized by content-route; hreflang annotations layer on top, not a structural rewrite.

## Decisions

### D1 — Locale registry: single source of truth

**Decision**: A new `src/i18n/locales.ts` module exports `LOCALES`, `DEFAULT_LOCALE`, and `Locale` type. Every other file consuming locales (astro.config.ts, sitemap config, content schemas, lint gates, manifest renderers) imports from this module — no duplicated literal arrays.

**Why**: The pt165 (Tweaks pre-paint allow-list sync gate) and pt167 (orphan `[data-theme="slate"]` removal) showed the cost of duplicated allow-lists across multiple sources. Locales will be referenced from at LEAST 6 places (astro.config.ts, content.config.ts, sitemap config, SeoTags, BaseLayout, lint gates). Single-source eliminates the drift class before it can occur.

**Alternatives considered**:

- Hardcoded array in `astro.config.ts` only, other consumers re-import from there — rejected because the config file is execution-context-heavy (Astro's TypeScript config plugin); a plain `.ts` module is cleaner to import from tests + scripts.
- JSON file (`src/i18n/locales.json`) — rejected because the locale list participates in TypeScript discriminated unions for `Locale` type; JSON loses static-type safety.

### D2 — UI strings: per-locale JSON keyed by dot-path identifier

**Decision**: `src/i18n/{locale}/strings.json` files keyed by dot-path identifiers (`nav.platform`, `footer.legal.privacy`, `aria.skip-link`, `cta.request-access`). Build-time helper `t(locale: Locale, key: string): string` resolves the key against `{locale}/strings.json` with fallback to `en/strings.json` if missing. The helper routes through `src/lib/charset.ts` (extends the existing `safeJsonLd` chokepoint pattern).

**Why**: Dot-path keys are stable across schema evolution (renaming a button doesn't break translators' workflow — only the value changes). JSON is edit-friendly + JSON-Schema-validatable (future improvement). Build-time resolution means zero runtime cost (strings are inlined into the static HTML).

**Alternatives considered**:

- Astro Content Collection (`src/content/i18n/{locale}/strings.mdx`) — rejected because UI strings don't need MDX (no rich content); JSON is simpler + smaller.
- `astro-i18next` library — rejected per the Astro 6 research finding; built-in routing + JSON is sufficient.
- ICU MessageFormat library (`@formatjs/intl-messageformat`) — rejected because current strings have zero plural / date / select patterns; ICU is a future-when-needed dep.

### D3 — Content-collection localization: per-locale directories with `locale` schema field

**Decision**: Migrate `src/content/{pages,writing,authors}/*.mdx` into `src/content/{pages,writing,authors}/en/*.mdx`. Schema gains required `locale: z.enum(LOCALES).default("en")` field. Loader `glob` patterns become `**/*.{md,mdx}` (unchanged) — Astro's content layer indexes by full path so `pages/en/vision.mdx` has `id: "en/vision"`. Page rendering filters by locale via `getCollection("pages", (entry) => entry.data.locale === locale)`.

**Why**: Per-locale directories scale independently (Spanish doesn't need every English page; English doesn't need Spanish-only pages). Astro's `id` includes the directory path so cross-locale lookups (`en/vision` vs `es/vision`) are unambiguous.

**Alternatives considered**:

- Per-slug suffix pattern (`vision.en.mdx`, `vision.es.mdx`) — rejected because the loader's `glob` doesn't naturally separate by suffix; would need custom `generateId`.
- Single file with frontmatter `translations` map (`{ en: {...}, es: {...} }`) — rejected because translation contributors editing one file with all locales creates merge-conflict hotspots.

### D4 — Data-module externalization: structure-string split

**Decision**: Each `src/data/*.ts` splits into:

1. `src/data/{name}.ts` — TypeScript shape (interfaces, IDs, asset paths, glossary references). The CONTAINER.
2. `src/i18n/{locale}/data/{name}.json` — strings keyed by structural ID. The CONTENT.

A new helper `localizeData<T>(structure: T, locale: Locale): T` walks the structure and resolves string-keyed lookups at build time. Each data module exports a `localized()` factory that page components call: `const FAQS = await localizeData(FAQ_STRUCTURE, locale)`.

**Why**: The 11 data files have ~1,200 strings but the STRUCTURE (IDs, asset paths, type unions) is locale-orthogonal. Splitting protects translators from accidentally breaking type contracts (they can't reorder array items, can't change discriminated-union tag values). It also localizes per-locale review burden — translators only diff JSON files.

**Alternatives considered**:

- Inline `t()` calls in data files (`label: t(locale, "pillars.identity.title")`) — rejected because data files are pure-data; injecting locale parameter into every export changes their signature and forces every consumer through a localized factory.
- Side-by-side translation files in same TypeScript module — rejected because it bloats data files (FAQ already 205 lines; ×N locales becomes unreadable).

### D5 — Astro routing: `prefixDefaultLocale: false`

**Decision**: `astro.config.ts` sets `i18n: { locales: ["en"], defaultLocale: "en", routing: { prefixDefaultLocale: false } }`. English routes stay at `/`, `/platform`, etc. Future locales prefix at `/{locale}/...`. The initial `locales` array contains only `["en"]` until the first non-English content port lands.

**Why**: The site already has 22 indexed routes with canonical URLs at `/route` (no prefix). `prefixDefaultLocale: true` would force `/en/route` and trigger sitemap + canonical + Google-indexed-URL churn — net-negative for the existing indexable surface area. `prefixDefaultLocale: false` keeps English unchanged; new locales layer underneath.

**Alternatives considered**:

- `prefixDefaultLocale: true` for symmetry (every locale gets a prefix, including English) — rejected per the SEO churn argument.
- Skip Astro's i18n routing entirely; manage locale via custom middleware — rejected because Astro's built-in routing provides `getAbsoluteLocaleUrl`, `Astro.preferredLocale`, and `Astro.preferredLocaleList` for free; reinventing is risk + maintenance burden.

### D6 — JSON-LD localization: canonical English schemas + per-page Article translation

**Decision**:

- Organization / Service / WebSite JSON-LD stays in canonical English (added `inLanguage: "en"`).
- Per-page Article JSON-LD localizes `headline` + `description` only; `author` Person stays canonical (proper noun); `datePublished` / `dateModified` / `url` adapt per-locale.
- Each page's primary `<script type="application/ld+json">` adds `inLanguage: locale`.

**Why**: Per the Astro 6 research + Google's Article rich-result documentation: translating brand schemas (Organization / Service / WebSite) signals separate entities to crawlers, hurting brand consolidation. Article translation is the canonical pattern — `headline` + `description` per-locale, brand schema canonical.

**Alternatives considered**:

- Translate every JSON-LD schema per locale — rejected per the brand-entity-fragmentation concern.
- Skip `inLanguage` annotation — rejected because it's a free signal to crawlers about per-page locale; missing it costs a 1-line addition and possibly some Article rich-result quality.

### D7 — Sitemap hreflang via `@astrojs/sitemap` `i18n` config

**Decision**: `astro.config.ts` `sitemap()` integration gains `i18n: { defaultLocale: "en", locales: { en: "en-US" } }` (initially single-locale; future locales extend the locales map). Auto-generates `<xhtml:link rel="alternate" hreflang="...">` per URL.

**Why**: The integration is already installed (pt146 noindex-routes filter); adding the `i18n` config block is 4 lines. `@astrojs/sitemap` handles the hreflang plumbing correctly — manual generation would re-derive URL pairs, error-prone.

**Alternatives considered**:

- Manual hreflang generation in postbuild via `scripts/generate-hreflang.mjs` — rejected because the integration's auto-gen is correct + tested upstream.
- `<link rel="alternate" hreflang>` only in `<head>` (not sitemap) — rejected because sitemap-with-alternates is canonical for Google's crawler discovery; head-only relies on crawler walking every page.

### D8 — PWA manifest per-locale variants

**Decision**: Generate one manifest file per locale via a postbuild step (`scripts/generate-locale-manifests.mjs`). English ships at `/site.webmanifest` (unchanged). Other locales ship at `/site.{locale}.webmanifest`. Per-locale `<link rel="manifest">` in `SeoIcons.astro` resolves the active locale's path. The 11-icon array stays shared; only `name` / `short_name` / `description` translate.

**Why**: PWA installation context is locale-aware (Android Chrome reads the manifest for the user's current site session). Per-locale manifests give translated install prompts ("Instalar Artagon") + correct screen-reader announcements during install. Generation script reads `src/i18n/{locale}/strings.json` for the 3 manifest fields (`pwa.name`, `pwa.short-name`, `pwa.description`) and emits a JSON file.

**Alternatives considered**:

- Single manifest with all locales' fields concatenated — rejected because the W3C manifest spec doesn't support multi-locale fields.
- Skip per-locale manifests entirely — rejected because the install-prompt UX divergence is visible to AT + non-English users on every install attempt.

### D9 — Milestone structure with adversarial reviews

**Decision**: Implementation proceeds in 5 sequential milestones, each landing as a separate commit with `Closes <milestone-tag>` body. After each milestone's commit, an adversarial multi-agent review runs (parallel `pr-review-toolkit` agents per CLAUDE.md "Review workflow" section) — code-reviewer + silent-failure-hunter + type-design-analyzer at minimum. Specific agents per milestone:

| Milestone                                          | Scope                                                                                                                                                                                                                                                  | Adversarial Review Lenses                                                                                                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1: UI-strings extraction + locale registry        | `src/i18n/locales.ts` + `src/i18n/en/strings.json` + `t()` helper + nav/footer/ARIA strings migrated                                                                                                                                                   | code-reviewer + silent-failure-hunter (does `t()` swallow missing keys?) + type-design-analyzer (is `Locale` type narrow + exhaustive?)                                                                                                                      |
| M2: Data-module externalization                    | 11 `src/data/*.ts` split into structure + `src/i18n/en/data/{name}.json`; `localizeData()` helper                                                                                                                                                      | code-reviewer + comment-analyzer (do types still document the locale-orthogonal contract?) + type-design-analyzer (encapsulation: localizeData should NOT leak partial-locale state) + pr-test-analyzer (test coverage for fallback + key-mismatch behavior) |
| M3: Content-collection per-locale migration        | All `src/content/{pages,writing,authors}/*.mdx` move into `en/` subdirectory; schema gains `locale` field; loader patterns unchanged                                                                                                                   | code-reviewer + silent-failure-hunter (does Astro's content cache invalidate correctly? — pt162 caught this; verify) + comment-analyzer (do schema-field comments still match runtime behavior?)                                                             |
| M4: SEO multi-locale wiring                        | SeoTags emits `og:locale` + `og:locale:alternate` + `<link rel="alternate" hreflang>`; sitemap config + per-locale manifest generator; `inLanguage` JSON-LD                                                                                            | code-reviewer + silent-failure-hunter (any locale-dependent SEO field that defaults silently?) + pr-test-analyzer (each existing SEO gate continues passing; 4 new gates added with smoke-tests)                                                             |
| M5: First non-English locale port (pipeline proof) | A single locale (proposal: Spanish) gets `src/i18n/es/strings.json` + `src/i18n/es/data/*.json` + `src/content/{collection}/es/*.mdx`. Verify the entire pipeline end-to-end. NOT a content-translation deliverable — minimal stub strings sufficient. | FULL `pr-review-toolkit` Tier 1 + Tier 2 (code-reviewer + silent-failure-hunter + type-design-analyzer + astro-expert + comment-analyzer + pr-test-analyzer + ux-design-expert) — broad adversarial coverage because this is the first end-to-end test.      |

**Why**: Milestones with explicit review gates prevent the architecture from being declared "done" before stress-testing. Each milestone's adversarial review must produce a "approved with comments / approved / changes-requested" verdict; merging proceeds only on "approved". This mirrors the pt121-pt172 Ralph-loop discipline: each iter shipped a single fix + tested it; here each milestone ships a single architectural slice + adversarially reviewed it.

**Alternatives considered**:

- Land everything in one PR — rejected because the diff would be 1,000+ files (every MDX moves into `en/`, every data file splits) and adversarial review couldn't inspect it meaningfully.
- Run reviews only at the end — rejected because architectural drift discovered at M5 forces rework of M1-M4.

## Risks / Trade-offs

- **[Risk: Astro 6 i18n routing changes the /sitemap-0.xml output shape, breaking the pt146 lint-sitemap-noindex gate's URL-matching logic]** → Mitigation: M4 adversarial review explicitly verifies pt146 + pt147 + pt150 gates continue passing; if they break, adapt the gates to the new URL shape (the gate asserts contract, not URL syntax).

- **[Risk: Content-collection per-locale migration breaks `lint-aria-refs` (pt135) because content-collection IDs change from `vision` to `en/vision`]** → Mitigation: M3 review re-runs the full vitest suite + canonical-typography Playwright suite. The rename surfaces as a build-time content-cache miss (per pt162's `.astro/` cache lesson); the test suite catches any rendered-HTML regression.

- **[Risk: `localizeData()` helper has a race condition where two pages localize the same data module concurrently and produce different output]** → Mitigation: Astro's static build is single-threaded per page render; concurrent calls are impossible. Belt-and-braces: helper is a pure function that returns a fresh object per call (no shared mutable state).

- **[Risk: PWA manifest generation script outputs wrong manifest at deploy because locale parameter mismatches]** → Mitigation: postbuild generates manifests deterministically from `src/i18n/{locale}/strings.json` (the json source-of-truth); a regression gate asserts every locale in `LOCALES` has a corresponding `/site.{locale}.webmanifest` file in `dist/`.

- **[Risk: Translators edit `en/strings.json` keys but other locales' `{locale}/strings.json` files don't keep up; runtime falls back to English silently and translation looks "done"]** → Mitigation: `lint-locale-strings-sync` gate (the proposal's NEW gate #1) asserts every key in `en/strings.json` exists in every other-locale strings file — fails the build with the missing-key list. Translators see the error and add the missing key (even if they leave value as `TODO_TRANSLATE`).

- **[Risk: Hreflang misconfiguration on a partial locale rollout (Spanish has /platform but not /faq) confuses Google's crawler]** → Mitigation: `lint-hreflang-coverage` gate asserts every built `.html` page has hreflang for every configured locale; if a locale doesn't have a translated page, the hreflang for that locale points at `x-default` (English fallback). Astro's i18n `fallback: { es: "en" }` config supports this gracefully.

- **[Risk: The `ignore-scripts=true` user-env constraint (pt163) means the local dev's first M4 build won't run the postbuild gates that emit per-locale manifests, so the dev's `dist/site.es.webmanifest` is missing]** → Mitigation: Documented per pt163; CI runs the full postbuild chain. The M5 milestone's full-Tier review verifies CI-green before declaring complete.

- **[Trade-off: `prefixDefaultLocale: false` means English URLs stay un-prefixed but other locales get the prefix; this is asymmetric]** → Accepted. The asymmetry minimizes SEO churn for the primary market (English-as-existing) at the cost of a slight architectural inconsistency. Reversible if a future proposal decides to re-prefix English.

- **[Trade-off: 4 new permanent regression gates + ~6 milestones of churn add ~2-3 weeks of implementation work]** → Accepted. The scope is the cost of getting i18n right; rushing it would re-introduce the pt121-pt172 drift classes (mismatched manifests, broken canonical URLs, missing hreflang) that the SEO sweep just closed.

## Migration Plan

1. **Preparation (M0 — pre-implementation)**:
   - Land this OpenSpec proposal + design + specs + tasks (this document set).
   - User reviews + approves the architecture decisions (especially D4 structure-string split and D9 milestone gating).
   - No code changes; this is the design-first step.

2. **M1 — UI strings extraction (1-2 days)**:
   - Create `src/i18n/locales.ts` + `src/i18n/en/strings.json` + `t()` helper.
   - Migrate Header, Footer, FaqSearch, RoadmapTimeline, 404, ARIA labels.
   - Adversarial review (code-reviewer + silent-failure-hunter + type-design-analyzer).
   - Commit 1: `feat(i18n-m1): extract UI strings + locale registry`.

3. **M2 — Data-module externalization (3-5 days)**:
   - Split each of the 11 `src/data/*.ts` files into structure + `src/i18n/en/data/{name}.json`.
   - Implement `localizeData()` helper.
   - Update every consumer (UseCasesIsland, PillarsIsland, BridgeFlow, etc.) to call the localized factory.
   - Adversarial review (code-reviewer + comment-analyzer + type-design-analyzer + pr-test-analyzer).
   - Commit 2: `feat(i18n-m2): externalize data modules`.

4. **M3 — Content-collection per-locale migration (1-2 days)**:
   - Move `src/content/{pages,writing,authors}/*.mdx` into `en/` subdirectory.
   - Update `content.config.ts` schemas with `locale` field.
   - Verify Astro content cache invalidates (`rm -rf .astro` if needed per pt162).
   - Adversarial review (code-reviewer + silent-failure-hunter + comment-analyzer).
   - Commit 3: `feat(i18n-m3): per-locale content directories`.

5. **M4 — SEO multi-locale wiring (2-3 days)**:
   - Update SeoTags + SeoIcons + BaseLayout for locale-aware canonical / og / hreflang / `<html lang>`.
   - Update sitemap config with `i18n` block.
   - Add 4 new permanent regression gates (locale-strings-sync, hreflang-coverage, locale-canonical, html-lang).
   - Smoke-test each gate by injecting a synthetic regression (per pt165/pt171/pt172 pattern).
   - Adversarial review (code-reviewer + silent-failure-hunter + pr-test-analyzer).
   - Commit 4: `feat(i18n-m4): SEO multi-locale + 4 regression gates`.

6. **M5 — First non-English pipeline proof (1 day)**:
   - Pick Spanish (`es`) as the first locale to add to `LOCALES`.
   - Create stub `src/i18n/es/strings.json` (minimal; can be `TODO_TRANSLATE` placeholders).
   - Add `src/content/{collection}/es/` directories (empty initially; fallback routing covers).
   - Verify end-to-end: locale-strings-sync gate passes (no key drift), hreflang-coverage gate passes, /es/\* routes render with es fallback to en content.
   - Full-Tier adversarial review (Tier 1 + Tier 2 from CLAUDE.md "Review workflow" tier system).
   - Commit 5: `feat(i18n-m5): es locale stub — pipeline end-to-end proof`.

7. **Rollback strategy**: Each milestone's commit is independently revertable. M5 reversal removes one locale entry from `LOCALES`; M4 reverses i18n routing config; M3 moves files back to flat `src/content/`; M2 inlines strings back into data modules; M1 inlines strings back into components. The 5-commit sequence preserves bisectability.

## Open Questions

1. **Which locale to add first in M5 (pipeline proof)?** Spanish (`es`) is proposed for highest user-base impact. Alternative: French (`fr`) for Quebec / France markets. Resolution: User picks; default to `es` if no pref. The choice doesn't affect M1-M4 architecture.

2. **Should `aria-label` strings live in the same `strings.json` as visible text, or separate `aria.json` for clarity?** Proposal: Same file with `aria.*` key prefix (e.g., `aria.skip-link`, `aria.toggle-nav`). Translators editing visible text often need to update the corresponding ARIA label too; co-locating reduces forgotten-update risk.

3. **What's the canonical key-naming convention for dot-paths?** Proposal: `{surface}.{component}.{element}` — e.g., `nav.cta.request-access`, `footer.legal.privacy`, `aria.faq-search`. Avoids ambiguity when the same word ("Privacy") appears in multiple surfaces (header link, footer link, page title).

4. **Do we need a glossary-aware translation layer for `src/data/glossary.ts`?** That file has 100+ tech-acronym terms (OIDC, GNAP, DPoP, etc.) that are NOT translated — they stay canonical English. Proposal: glossary terms are `en`-only by convention; the `t()` helper for glossary keys returns the canonical English regardless of `locale` parameter. Document in design.md to prevent future translator confusion.

5. **Should the `add-{locale}-content` follow-up proposals be in this repo or separate?** Proposal: separate proposals to keep merge-velocity high. The architectural changes (this proposal) land first; per-locale content proposals are independent.

6. **Where do the JSON Schemas for `strings.json` files live?** Proposal: `src/i18n/strings.schema.json` (auto-derived from English file via `keys-of(en/strings.json)`). The `lint-locale-strings-sync` gate uses this schema to validate other-locale files. If a key gets renamed in `en/`, the schema changes and translators get a clear migration error.
