## 1. M0 — Pre-implementation foundation

- [ ] 1.1 Land this OpenSpec proposal + design + specs + tasks (this document set) — user reviews + approves D1-D9 architecture decisions
- [ ] 1.2 Decide which non-default locale lands first in M5 (proposal: `es`; alternative: `fr` — user picks)
- [ ] 1.3 Decide aria-label co-location (proposal: same `strings.json` with `aria.*` prefix — user confirms)
- [ ] 1.4 Decide glossary translation policy (proposal: glossary terms `en`-only by convention — user confirms)
- [ ] 1.5 Verify `update-site-marketing-redesign` (USMR) merge-order — i18n cannot land specs that modify USMR-introduced capabilities (`site-structured-data`, `site-indexation`, `site-branding`) until USMR archives. Document the merge-order dependency in the change's README

## 2. M1 — UI strings extraction + locale registry

- [ ] 2.1 Create `src/i18n/locales.ts` exporting `LOCALES`, `DEFAULT_LOCALE`, `Locale` type — single source of truth (D1)
- [ ] 2.2 Create `src/i18n/en/strings.json` with all extracted UI strings (nav, footer, ARIA labels, CTAs, error messages) keyed by dot-path identifiers (D2)
- [ ] 2.3 Implement `t(locale, key)` helper in `src/lib/charset.ts` (extends safeJsonLd chokepoint pattern) with build-time resolution + en fallback + missing-key warning
- [ ] 2.4 Migrate `src/components/Header.astro` strings to `t()` consumption (NAV_LINKS labels, button labels, ARIA labels)
- [ ] 2.5 Migrate `src/components/Footer.astro` strings (column headings, link labels, copyright, stack-credit, version-format)
- [ ] 2.6 Migrate `src/components/FaqSearch.astro` strings (placeholder, ARIA, button labels)
- [ ] 2.7 Migrate `src/components/RoadmapTimeline.astro` strings (section title, status labels, phase content rendering)
- [ ] 2.8 Migrate `src/pages/404.astro` strings (h1, lede, alt-route labels)
- [ ] 2.9 Migrate ARIA labels site-wide via grep + replace (~20 strings: skip-link, nav-toggle, GitHub button, search inputs, brand-link, etc.)
- [ ] 2.10 Run vitest + build; verify all existing 29 gates continue passing
- [ ] 2.11 Commit M1: `feat(i18n-m1): extract UI strings + locale registry — Closes externalize-strings-and-add-i18n M1`
- [ ] 2.12 **ADVERSARIAL REVIEW M1** (parallel via pr-review-toolkit per CLAUDE.md):
  - `pr-review-toolkit:code-reviewer` — neutral correctness pass on the new `t()` helper + extracted-strings JSON
  - `pr-review-toolkit:silent-failure-hunter` — does `t()` swallow missing keys? what's the behavior on completely-malformed `strings.json`? Are warnings actually surfaced?
  - `pr-review-toolkit:type-design-analyzer` — is `Locale` type narrow + exhaustive? Does the dot-path-key string type hint at validity (or is it just `string`)?
- [ ] 2.13 Address adversarial findings; store review report at `openspec/changes/externalize-strings-and-add-i18n/reviews/m1.md`

## 3. M2 — Data-module externalization

- [ ] 3.1 Implement `localizeData<T>(structure, locale)` helper in `src/lib/charset.ts` (D4)
- [ ] 3.2 Split `src/data/affiliations.ts` → structure file + `src/i18n/en/data/affiliations.json`
- [ ] 3.3 Split `src/data/bridge.ts` → structure + en JSON (parties, steps, labels)
- [ ] 3.4 Split `src/data/faq.ts` → structure + en JSON (21 Q&A items + 6 categories)
- [ ] 3.5 Split `src/data/glossary.ts` → structure + en JSON (100+ terms; per Open Question #4, terms stay `en`-only — but values still go to `en/data/glossary.json` so the format stays consistent)
- [ ] 3.6 Split `src/data/home-explore.ts` → structure + en JSON (6 cards × title/desc/href)
- [ ] 3.7 Split `src/data/organization.ts` → structure + en JSON (canonical organization metadata; mostly locale-orthogonal but `description` translates)
- [ ] 3.8 Split `src/data/pillars.ts` → structure + en JSON (3 pillars × 5 fields, 3 specimens, glossary token chains)
- [ ] 3.9 Split `src/data/roadmap.ts` → structure + en JSON (5 phases + status meta)
- [ ] 3.10 Split `src/data/standards.ts` → structure + en JSON (3 groups + 4+ badges)
- [ ] 3.11 Split `src/data/trust-chain.ts` → structure + en JSON (5 stages + 4+ scenarios with pass/fail/skip outcomes)
- [ ] 3.12 Split `src/data/use-cases.ts` → structure + en JSON (4 scenarios × full content)
- [ ] 3.13 Update consumers of `src/data/*.ts`: components call `localizeData(STRUCTURE, locale)` instead of importing strings directly
- [ ] 3.14 Verify all React islands (BridgeFlow, PillarsIsland, TrustChainIsland, UseCasesIsland, TweaksPanel) consume localized data via the factory pattern
- [ ] 3.15 Add unit test for `localizeData` covering: full structure, partial-key fallback, missing-key warning, nested-array handling
- [ ] 3.16 Run vitest + build; all 29 existing gates continue passing
- [ ] 3.17 Commit M2: `feat(i18n-m2): externalize data modules — Closes externalize-strings-and-add-i18n M2`
- [ ] 3.18 **ADVERSARIAL REVIEW M2**:
  - `pr-review-toolkit:code-reviewer` — neutral correctness on the structure-string split per file
  - `pr-review-toolkit:comment-analyzer` — do schema-field comments still document the locale-orthogonal contract? Did any "Pre-fix used `var(--N)`..."-class drift (pt169 lesson) creep into the new files?
  - `pr-review-toolkit:type-design-analyzer` — does `localizeData` encapsulate correctly (no leaked partial-locale state, returns fresh object per call)?
  - `pr-review-toolkit:pr-test-analyzer` — coverage for fallback + key-mismatch + nested-structure cases
- [ ] 3.19 Address findings; store at `reviews/m2.md`

## 4. M3 — Content-collection per-locale migration

- [ ] 4.1 Move all `src/content/pages/*.mdx` files into `src/content/pages/en/` subdirectory (6 files: home, platform, vision, use-cases, standards, roadmap)
- [ ] 4.2 Move all `src/content/writing/*.mdx` files into `src/content/writing/en/` subdirectory (3 posts)
- [ ] 4.3 Move `src/content/authors/*.mdx` files into `src/content/authors/en/` subdirectory (1 file: trumpyla.mdx — note pt162's filename-vs-slug discipline still applies)
- [ ] 4.4 Update `src/content.config.ts`: add `locale: z.enum(LOCALES).default(DEFAULT_LOCALE)` to `pages` + `writing` + `authors` schemas (D3)
- [ ] 4.5 Verify Astro content cache invalidates after the move — `rm -rf .astro` may be required (per pt162's lesson)
- [ ] 4.6 Update page route handlers to filter by locale: `getCollection("pages", entry => entry.data.locale === locale)`
- [ ] 4.7 Verify content IDs change predictably: `vision` → `en/vision` (cross-references in [slug].astro / writing/index.astro / etc. must still resolve)
- [ ] 4.8 Run vitest + Playwright canonical-typography spec; all 22+25 = 47 gates continue passing
- [ ] 4.9 Commit M3: `feat(i18n-m3): per-locale content directories — Closes externalize-strings-and-add-i18n M3`
- [ ] 4.10 **ADVERSARIAL REVIEW M3**:
  - `pr-review-toolkit:code-reviewer` — neutral pass on directory restructure + schema field
  - `pr-review-toolkit:silent-failure-hunter` — does Astro's content cache invalidate correctly? does any code path silently fall back to `getCollection("pages")` without locale filter?
  - `pr-review-toolkit:comment-analyzer` — do the schema-field comments document the locale contract clearly? Are any references to old `vision.mdx` paths (without `en/`) still in comments?
- [ ] 4.11 Address findings; store at `reviews/m3.md`

## 5. M4 — SEO multi-locale wiring + 4 new regression gates

- [ ] 5.1 Update `astro.config.ts` with `i18n: { locales: LOCALES, defaultLocale: DEFAULT_LOCALE, routing: { prefixDefaultLocale: false } }` (D5)
- [ ] 5.2 Update `astro.config.ts` `sitemap()` integration with `i18n: { defaultLocale: "en", locales: { en: "en-US" } }` for hreflang auto-gen (D7)
- [ ] 5.3 Update `src/components/SeoTags.astro`:
  - Emit `<meta property="og:locale" content="{locale-code}">` per page
  - Emit `<meta property="og:locale:alternate" content="...">` for each non-current locale
  - Emit `<link rel="alternate" hreflang="...">` per configured locale + `x-default`
  - Locale-aware canonical URL via `getAbsoluteLocaleUrl(locale, pathname)`
  - Article JSON-LD adds `inLanguage: locale` (per-page Article only; Organization/Service/WebSite stay canonical English per D6)
- [ ] 5.4 Update `src/layouts/BaseLayout.astro`: `<html lang={locale}>` resolves per-route (was hardcoded `lang="en"`)
- [ ] 5.5 Implement `scripts/generate-locale-manifests.mjs` (D8): postbuild step that emits `/site.{locale}.webmanifest` for each non-default locale, reading `pwa.name` / `pwa.short-name` / `pwa.description` from `src/i18n/{locale}/strings.json`
- [ ] 5.6 Update `src/components/SeoIcons.astro`: `<link rel="manifest" href="/site.{locale}.webmanifest">` (defaults to `/site.webmanifest` for default locale per D8 backward-compat)
- [ ] 5.7 Wire `scripts/generate-locale-manifests.mjs` into the postbuild chain in `package.json` (after csp.mjs/sri.mjs)
- [ ] 5.8 Implement NEW gate: `tests/lint-locale-strings-sync.test.mts` — every key in `en/strings.json` exists in every other-locale strings file; same for `en/data/*.json`
- [ ] 5.9 Implement NEW gate: `tests/lint-hreflang-coverage.test.mts` — every built `.html` page has hreflang for every configured locale + `x-default`
- [ ] 5.10 Implement NEW gate: `tests/lint-locale-canonical.test.mts` — per-locale canonical URLs match the route's locale prefix
- [ ] 5.11 Implement NEW gate: `tests/lint-html-lang.test.mts` — `<html lang="...">` matches the rendered route's locale
- [ ] 5.12 Smoke-test each of the 4 new gates by injecting a synthetic regression (per pt165/pt171/pt172 pattern) — verify each fails cleanly with file:line
- [ ] 5.13 Verify the 7-gate SEO-pipeline contract continues passing (pt146 sitemap-noindex, pt147 canonical-url, pt148 no-double-brand, pt150 BreadcrumbList-noindex, pt151 article-author-Person, pt154 article-og-author, pt152 jsonld-trailing-slash)
- [ ] 5.14 Run vitest (now 33 gates total: 29 prior + 4 new) + build; all green
- [ ] 5.15 Commit M4: `feat(i18n-m4): SEO multi-locale + 4 regression gates — Closes externalize-strings-and-add-i18n M4`
- [ ] 5.16 **ADVERSARIAL REVIEW M4**:
  - `pr-review-toolkit:code-reviewer` — neutral pass on SeoTags + manifest-generator + 4 new gates
  - `pr-review-toolkit:silent-failure-hunter` — any locale-dependent SEO field that defaults silently? does the manifest-generator skip missing keys without warning?
  - `pr-review-toolkit:pr-test-analyzer` — gate coverage analysis: do the 4 new tests catch the regression class fully? Are smoke-tests representative?
- [ ] 5.17 Address findings; store at `reviews/m4.md`

## 6. M5 — First non-English locale port (pipeline proof)

- [ ] 6.1 Add the chosen non-English locale (default proposal: `"es"`) to `LOCALES` in `src/i18n/locales.ts`
- [ ] 6.2 Create `src/i18n/es/strings.json` — minimal stub; values can be `TODO_TRANSLATE` placeholders (the gate accepts these per the proposal's allow-list); ALL keys from `en/strings.json` must be present (the sync gate enforces it)
- [ ] 6.3 Create `src/i18n/es/data/*.json` files mirroring `en/data/*.json` keys
- [ ] 6.4 Create `src/content/{pages,writing,authors}/es/` directories (empty initially; Astro fallback routing serves English content for unfilled routes)
- [ ] 6.5 Configure Astro fallback: `i18n: { ..., fallback: { es: "en" }, fallbackType: "rewrite" }` so Spanish routes that lack content fall through to English without 404
- [ ] 6.6 Verify build emits both `/` (English) and `/es/` (Spanish) routes; sitemap-0.xml has hreflang for every URL pair
- [ ] 6.7 Verify per-locale Lighthouse runs continue passing (CI matrix adds `npm run test:lhci -- --collect.url=https://artagon.com/es/`)
- [ ] 6.8 Verify all 33 gates pass (29 prior + 4 new)
- [ ] 6.9 Commit M5: `feat(i18n-m5): es locale stub — pipeline end-to-end proof — Closes externalize-strings-and-add-i18n M5`
- [ ] 6.10 **ADVERSARIAL REVIEW M5** (FULL TIER per D9):
  - **Tier 1**: `pr-review-toolkit:code-reviewer` + `pr-review-toolkit:silent-failure-hunter` + `pr-review-toolkit:type-design-analyzer` + custom `astro-expert` brief (Tier 1 promotion since this diff touches src/pages, src/components, astro.config.ts)
  - **Tier 2**: `pr-review-toolkit:comment-analyzer` + `pr-review-toolkit:pr-test-analyzer` + `ux-design-expert` (Spanish layout integrity — even if just stub strings, verify no horizontal-overflow, font-rendering, or directional-icon issues at the layout layer)
  - **Architectural-review trio** (per CLAUDE.md): `security-architect-reviewer` + `modularity-and-boundaries-reviewer` + `type-system-architect-reviewer` (because M5 is the first end-to-end pipeline test, the broadest adversarial coverage de-risks the architecture before downstream content proposals layer on top)
- [ ] 6.11 Address findings; store at `reviews/m5.md`

## 7. Post-M5 — handoff + follow-ups

- [ ] 7.1 Document the i18n architecture in `docs/i18n.md`: how to add a new locale (file checklist), how to add a new UI string (key naming), how `localizeData` works, what gates fire
- [ ] 7.2 Update CLAUDE.md "Symbolic references" table with the new `src/i18n/` directory + 4 new gate paths
- [ ] 7.3 Update DESIGN.md §"Accessibility" with the WCAG 3.1.1 (`<html lang>`) + 3.1.2 (per-element lang for foreign-language proper nouns, future scope) contracts
- [ ] 7.4 Re-validate: 7-gate SEO contract + 22-gate canonical-typography + 4 new i18n gates + everything else from the pt121-pt172 sweep all pass on CI
- [ ] 7.5 Open follow-up proposal: `add-spanish-content` (or chosen locale) — content-translation work for the first non-English locale; this is content-team scope, not architecture
- [ ] 7.6 Open follow-up proposal: `add-rtl-support` if a future RTL locale is on the roadmap (out of scope per proposal Non-Goals)
- [ ] 7.7 Archive this change: `openspec archive externalize-strings-and-add-i18n`
