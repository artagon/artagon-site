## Why

The site is English-only with ~1,300 user-facing strings scattered across `src/data/*.ts` (11 files), MDX content collections (`src/content/{pages,writing,authors}/`), Astro components, and ARIA labels. The project has already started externalization (`src/content/taglines.json` + `lint-taglines.mjs` enforcement) and the global memory note "future per-language bundles will load through a single safe-escape chokepoint" confirms the intent — but the scaffolding hasn't been extended past the 5 tagline strings. Multi-locale capability is required to address non-English markets, satisfy WCAG 3.1.1/3.1.2 (per-content language declaration), and let the structured-data pipeline (pt146→pt154 SEO sweep) emit per-locale `og:locale:alternate` + sitemap `hreflang` for Google's locale-aware indexing.

## What Changes

- **NEW** `src/i18n/{locale}/strings.json` per-locale UI-strings layer. UI strings (nav, footer, ARIA labels, error messages, CTAs) externalized from components into typed JSON bundles. Build-time helper `t(locale, key)` routes through the existing `src/lib/charset.ts` safe-escape chokepoint.
- **NEW** `src/i18n/locales.ts` registry exporting `LOCALES`, `DEFAULT_LOCALE`, `Locale` type. Single source of truth that `astro.config.ts`, content-collection schemas, sitemap config, and `<html lang>` consume — same dual-source-prevention pattern as pt165 (Tweaks pre-paint allow-list sync gate) + pt172 (security.txt root-vs-well-known sync gate).
- **NEW** Astro 6 built-in i18n routing in `astro.config.ts`: `i18n: { locales, defaultLocale: "en", routing: { prefixDefaultLocale: false } }`. English stays at `/`; other locales prefix at `/{locale}/`. `prefixDefaultLocale: false` minimizes SEO duplication for the primary market.
- **NEW** Per-locale content-collection directories: `src/content/{pages,writing,authors}/{locale}/file.mdx`. Loader `glob` patterns updated to scope by locale; schema gains `locale: z.enum(LOCALES)` field. Content-collection schemas extended without breaking existing MDX (default locale = `en` migrates the existing files into `en/` subdirectory).
- **NEW** Data-module externalization. `src/data/*.ts` (11 files, ~1,200 strings) refactored to separate **structure** (TypeScript shape, IDs, asset paths) from **strings** (per-locale JSON). Each module becomes `data/{name}.ts` (structure) + `i18n/{locale}/data/{name}.json` (strings); a `localizeData(structure, locale)` helper composes them at build time.
- **NEW** SEO multi-locale wiring in `SeoTags.astro`: `og:locale` + `og:locale:alternate` per page, `<link rel="alternate" hreflang="...">` for each locale variant, `<link rel="alternate" hreflang="x-default">` pointing at the canonical English URL. JSON-LD adds `inLanguage` per-page; Organization/Service/WebSite schemas stay canonical English (per Google's recommendation — translating brand schemas signals separate entities). Article `headline`/`description` are translated; `author` Person stays canonical.
- **NEW** Sitemap hreflang via `@astrojs/sitemap` `i18n: { defaultLocale, locales }` config. Auto-generates `<xhtml:link rel="alternate" hreflang="...">` per URL pair.
- **NEW** Permanent regression gates following the pt165/pt171/pt172 dual-source-sync pattern:
  - `lint-locale-strings-sync` — every key in `src/i18n/en/strings.json` MUST exist in every other-locale strings file (one-way completeness; missing translations fall back to English at runtime, never silently drop)
  - `lint-hreflang-coverage` — every built `.html` page MUST have `<link rel="alternate" hreflang>` for every configured locale + `x-default`
  - `lint-locale-canonical` — per-locale canonical URLs match the route's locale prefix (no `/es/about` shipping `<link rel="canonical" href="https://artagon.com/about">`)
  - `lint-html-lang` — `<html lang="...">` matches the rendered route's locale (extends pt135 lint-aria-refs pattern)
- **NEW** PWA manifest `name`/`short_name`/`description` localization via per-locale manifest files (`/site.webmanifest` for `en`, `/site.{locale}.webmanifest` for others), referenced by per-locale `<link rel="manifest">` in `SeoIcons.astro`.
- **MILESTONE STRUCTURE WITH ADVERSARIAL REVIEWS.** The implementation MUST proceed in 5 milestones; each milestone ends with a multi-agent review (per `pr-review-toolkit` lenses in CLAUDE.md): code-reviewer + silent-failure-hunter + type-design-analyzer + comment-analyzer + pr-test-analyzer. Specific lenses per milestone documented in tasks.md. Milestones land as separate commits with the `Closes <milestone-tag>` body.
- **CI POSTBUILD GATING.** The 7 SEO-pipeline gates from the pt146→pt154 sweep MUST continue passing post-i18n. The local-dev `ignore-scripts=true` user-env constraint (discovered pt163) means postbuild gates skip locally; CI runs the full chain. Every milestone's adversarial review MUST verify CI-green before declaring the milestone closed.
- **NOT BREAKING.** English content stays at `/{route}` (no `/en/` prefix per `prefixDefaultLocale: false`). Migration is additive; existing routes / canonicals / sitemap entries unchanged for English. Non-English locales are opt-in via `astro.config.ts` `locales:` array (start with English-only, add Spanish/French/etc. as separate proposals).

## Capabilities

### New Capabilities

- `site-i18n`: Per-locale UI-strings layer (`src/i18n/{locale}/strings.json`), data-module localization helper (`localizeData()`), Astro 6 i18n routing config, locale registry single-source-of-truth, content-collection per-locale directory structure, hreflang sitemap integration, locale-aware canonical/og/JSON-LD wiring, 4 new permanent regression gates (locale-strings-sync, hreflang-coverage, locale-canonical, html-lang).

### Modified Capabilities

- `site-content`: MDX content-collection schemas extend with `locale` enum; per-locale directories; default-locale (English) MDX migrates into `en/` subdirectory.

### Capabilities Pending USMR Archive

The following capabilities are introduced by `update-site-marketing-redesign` (USMR, in flight) but NOT yet present as live specs in `openspec/specs/`. This proposal touches their behavior at the implementation layer but defers the spec-delta authorship to the merge-order phase where USMR archives:

- `site-structured-data` (USMR-introduced): SeoTags will add `inLanguage` to Article JSON-LD and emit `og:locale` + `og:locale:alternate` + `<link rel="alternate" hreflang>` per locale — implementation lands in M4; spec-delta authoring follows USMR archive.
- `site-indexation` (USMR-introduced): sitemap config will gain `i18n: { defaultLocale, locales }` for hreflang auto-generation — same merge-order rule.
- `site-branding` (USMR-introduced): PWA manifest split into per-locale variants — same merge-order rule.

`style-system` cascade (`[data-hero-font]` / `[data-accent]` / `[data-theme]`) is locale-orthogonal — locale and visual-identity attributes compose without conflict; no requirement change.

## Impact

- **Affected code**: `astro.config.ts` (i18n config + sitemap i18n) · `src/content.config.ts` (collection schemas gain `locale`) · all `src/content/{pages,writing,authors}/*.mdx` (move into `en/` subdirectory) · `src/data/*.ts` (split structure ↔ strings) · `src/components/SeoTags.astro` (locale-aware canonical + og + JSON-LD + hreflang) · `src/components/SeoIcons.astro` (locale-aware manifest) · `src/components/{Header,Footer,FaqSearch}.astro` + `src/components/*.tsx` islands (consume `t()` helper instead of inline strings) · `src/lib/charset.ts` (extend with i18n-aware safe-string helper) · `src/layouts/BaseLayout.astro` (locale-aware `<html lang>` + skip-link).
- **NEW** `src/i18n/` directory: `locales.ts` (registry), `en/strings.json` (UI strings), `en/data/{name}.json` (per-data-module strings).
- **NEW** Tests: `lint-locale-strings-sync.test.mts`, `lint-hreflang-coverage.test.mts`, `lint-locale-canonical.test.mts`, `lint-html-lang.test.mts` — 4 new permanent regression gates (extending the 29-gate set established in pt121→pt172).
- **External APIs**: Google's hreflang + sitemap-with-alternates contract (RFC 9116-style spec compliance). OpenGraph `og:locale:alternate` (Facebook spec). JSON-LD `inLanguage` (schema.org).
- **Dependencies**: No new runtime deps. `@astrojs/sitemap` already installed; its i18n config is built-in. NO third-party i18n library (`astro-i18next`, `@astrojs/i18n` discouraged in research; built-in Astro 6 routing + JSON files is sufficient and lighter).
- **Build pipeline**: `npm run build` postbuild chain extends — sri.mjs / csp.mjs / lint-tokens.mjs / lint-skip-link.mjs / lint-taglines.mjs all unchanged. New gates (locale-strings-sync etc.) run in vitest. CI workflow adds a `lint:i18n` step before deploy. Local-dev `ignore-scripts=true` continues to skip postbuild silently — CI is the source of truth (documented per pt163).
- **Lighthouse CI**: existing thresholds (perf / a11y / SEO / best-practices) must continue passing per locale. Per-locale Lighthouse runs added to CI matrix — incremental cost ≈ 1 minute per locale.
- **Out of Scope**:
  - **Adding a second locale's content**. The proposal lays the pipeline; the first non-English content port is a separate proposal (`add-spanish-locale` or similar) so this proposal can be reviewed + merged + adversarially reviewed before content-translation work begins. Rationale: locks the architecture before testing it under a real locale's quirks (RTL handling, CJK fonts, plural forms — none currently in scope but would surface during a real port).
  - **Right-to-left (RTL) layout support**. The CSS cascade has no `dir="rtl"` handling; adding RTL is a distinct workstream. Rationale: the first 5 anticipated locales (en/es/fr/de/pt) are all LTR; RTL lands when an Arabic/Hebrew/Farsi locale is proposed.
  - **Pluralization / date / number formatting**. The current ~1,300 strings have NO plural-form, no `%d items` patterns, no locale-specific number formatting (per the audit). If a future locale needs ICU MessageFormat for plurals, that's a separate proposal layered on top. Rationale: avoid speculative complexity; current strings are simple labels.
  - **Per-locale OG image variants**. The 1200×630 OG image stays canonical English ("Artagon — Trusted Identity for Machines and Humans"). Per-locale image generation is a content-team workstream, not an architectural one. Rationale: image-generation pipeline is template-driven (`make-og-from-template.sh`); per-locale OG can be added without touching the i18n proposal.
  - **Translation memory / glossary tooling integration**. No CAT-tool integration (no Lokalise / Phrase / Crowdin webhook). Translation work happens via direct JSON edit. Rationale: the current 5-tagline + 1300-data-string scope is small enough for direct editing; CAT integration is overkill for now.
