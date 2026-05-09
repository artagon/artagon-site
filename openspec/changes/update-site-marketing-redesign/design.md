## Context

`artagon-site` is an Astro **5** static site (ESM, static output) with a strict "zero runtime JS by default" contract, SRI + CSP postbuild (`scripts/sri.mjs`, `scripts/csp.mjs`), Lighthouse CI, a Playwright test suite, Lychee link checks, and ast-grep (`sg`) as the primary linter (no ESLint). It has an existing `style-system` capability (post-archive of `fix-styling-refactor-gaps`) that owns theme tokens, `public/assets/theme.css`, and the `src/components/ui/` primitives; plus an in-flight `refactor-styling-architecture` change extending that capability. The existing `style-system` spec already references `data-theme="twilight"` in at least one scenario, so this change MODIFIES the relevant requirement (does not introduce twilight) and ADDS `midnight` alongside.

The redesign is committed to under `new-design/extracted/`, including a 761-line `DESIGN.md` (OKLCH tokens, motion budgets, component anatomy with Trust-chain tooltip and brand-icon system), HTML prototypes inlining JSX, and a draft proposal/tasks/design that this change adapts to the actual repo state. The mocks ship with a global `transform: scale()` mobile fallback that makes type unreadable below ~720 px — this plan replaces that fallback with fluid type + container queries.

## Goals / Non-Goals

### Goals

- Reuse and extend the existing `style-system` tokens and UI primitives; add new capabilities only where the existing one is the wrong owner (navigation, registry, bridge, mobile layout, structured data, indexation, branding).
- Land all new copy through Astro Content Collections (`src/content/pages/`) so editors update prose without touching components.
- Single `STANDARDS` registry reused by hero, footer, and `/standards`, emitted as `DefinedTerm` JSON-LD for rich results.
- Make the homepage hero, trust chain, standards chip row, and bridge sentence responsive down to 360 px without global viewport scale.
- Preserve existing SRI/CSP/Lighthouse/Playwright/Lychee/ast-grep gates; extend them with new linters (taglines, standards, bridge, meta, skip-link, brand, tokens) and validators (structured-data, indexation, font-metrics).
- Zero CLS regression on marketing routes: font metrics overrides neutralize FOUT reflow.
- WCAG 2.2 AA compliance on every in-scope route; AAA where cheap (tap target 44 px, chip focus 3:1).

### Non-Goals

- No docs-shell, console, or search redesign.
- No runtime JS framework; Astro islands only where essential (theme toggle + hamburger prefer CSS-only patterns).
- No new CSS framework or utility-first migration.
- No visual redesign of `/vision` beyond adopting shared tokens already in flight via `refactor-styling-architecture`.
- No i18n in this change.

## Decisions

### 1. Merge-order contract with `refactor-styling-architecture`

Both this change and `refactor-styling-architecture` edit `public/assets/theme.css`. To prevent a three-way conflict and undefined token state:

- **This change lands AFTER `refactor-styling-architecture` merges.** Enforced by `npm run verify:prerequisites` (built in Phase 0.5), which fails the build unless the prerequisite is archived OR its merge commit is an ancestor of `HEAD`. This is a CI gate, not just review hygiene.
- **While both are open, CODEOWNERS pins** `public/assets/theme.css`, `src/components/ui/**`, `src/layouts/BaseLayout.astro`, `astro.config.ts` (renamed from `astro.config.mjs` mid-USMR; CODEOWNERS pin updated at `.github/CODEOWNERS:31`), and `scripts/csp.mjs` to the same reviewer group.
- **`refactor-styling-architecture` ships raw-palette tokens first**; this change layers semantic aliases and `midnight` on top with the `Existing Token Preservation` requirement preventing accidental rebuild of `theme.css`.
- **A `pre-redesign` git tag** (Phase 0.6) captures the post-merge state of `BaseLayout.astro`, `theme.css`, and `csp.mjs` after `refactor-styling-architecture` archives — used by the multi-phase rollback path.

### 2. Theme axis: MODIFIED `twilight` (default) + ADDED `midnight`

Existing `style-system` spec already references `twilight` (Theme-Aware Fallback Tokens scenario). The delta MODIFIES that requirement to expand its token surface and ADDS `midnight` as a second named theme. Both are dark themes; no light-mode work in this change.

- **`twilight`** = warm dark editorial default (slight green-gray warmth in ink, paper-cream accent on headlines, intended for long-form reading on marketing routes).
- **`midnight`** = cool monochrome code-reader (deeper neutrals, cyan accent, intended for code-heavy reading on Platform / Bridge / writing posts with heavy code blocks).
- Theme toggle UX: footer location, `localStorage.theme` persistence, `prefers-color-scheme: light` honored on first visit (maps to `twilight`).

### 3. Content lives in `src/content/pages/*.mdx`

Every redesigned and added route reads frontmatter (title, description, eyebrow, headline, lede, CTAs, heading outline) and body through `getEntry('pages', slug)`. No prose in `.astro` files. Authors managed via `src/content/authors/*.mdx` with Zod schema validation. This extends the existing Content Collections + Type-Safe Content Schemas requirements.

### 4. Single `STANDARDS` registry

Typed export (`id`, `label`, `href`, `family`, `version`, `summary`, `longSummary`, `tooltip`, `extends?`, `uses?`, `lastVerified?`) in `src/data/standards.ts`. `StandardChip` and `StandardsRow` Astro primitives consume it. Hero, `/standards`, and footer all render from the same registry — enforced by `scripts/lint-standards.mjs`.

### 4a. BaseLayout slot ABI

`BaseLayout.astro` defines named slots — `<slot name="json-ld">`, `<slot name="indexation">`, `<slot name="branding">` — plus the existing default slot for body content. After Phase 3 lands the slots, the four BaseLayout-consuming capabilities (`site-navigation`, `site-structured-data`, `site-indexation`, `site-branding`) emit head-level tags via dedicated wrapper components (`<JsonLd/>`, `<Indexation/>`, `<Branding/>`) into the slots — they DO NOT directly edit `BaseLayout.astro`. This decouples four capabilities that would otherwise become a sequential merge bottleneck on a single load-bearing file.

### 4b. Lighthouse CI is the safety net only after the gate is hardened

The current `lighthouserc.json` collects `/` only and asserts performance at `warn` severity. Every other claim about Lighthouse "enforcing" perf budgets in this change is contingent on hardening that config. **`tasks.md §12.2` is the gate**: edit `lighthouserc.json` to (a) collect every marketing route + `/writing/[slug]`, (b) set perf to `error ≥ 0.9`, (c) assert CWV thresholds (LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms, INP ≤ 200 ms), (d) enforce a11y/SEO/best-practices ≥ 0.95. Until that lands, font-payload, JSON-LD-size, and CWV-budget Requirements are enforced by their own dedicated scripts (`measure-font-payload.mjs`, `validate-structured-data.mjs`, etc.), NOT by Lighthouse — Lighthouse is the secondary cross-check.

### 5. Responsive strategy: three global breakpoints + internal container boundary

- **Global breakpoints** (media queries, shared across the site): `--bp-sm: 480`, `--bp-md: 720`, `--bp-lg: 1080`.
- **Primitive-internal container boundary**: `TwoCol` uses `@container (inline-size < 640px)` — internal, not a global breakpoint, deliberately distinct from `--bp-md` because primitives compose into varied layouts.
- **Fallback** for browsers without container queries: `@supports not (container-type: inline-size) { @media (max-width: 640px) { ... } }`.
- **Display type**: `clamp()` viewport-based; floor at 360 px, ceiling at 1440 px (full scale below).
- **Trust chain and hero**: stack to single column below 720 px via global breakpoint (not container query — they live directly in the page layout).

### 6. Fluid type scale (per `DESIGN.md §3.2.2`)

| Role  | Formula                     | Notes                               |
| ----- | --------------------------- | ----------------------------------- |
| h1    | `clamp(56px, 7.2vw, 108px)` | line-height 0.94, tracking -0.035em |
| h2    | `clamp(36px, 4.0vw, 60px)`  | line-height 1.02, tracking -0.025em |
| h3    | `22px`                      | line-height 1.20, tracking -0.020em |
| lead  | `20px`                      | line-height 1.50                    |
| body  | `16px`                      | line-height 1.55                    |
| small | `13.5px`                    | line-height 1.50                    |
| micro | `11px` (mono, caps)         | line-height 1.40, tracking 0.14em   |

Tested at 360 px and 1920 px viewports. No heading reflows more than 3× between breakpoints.

### 7. Narrative ladder per marketing page

Three dwell tiers per hero:

- **5-second glance** — tagline + eyebrow answer "what is this?"
- **30-second scan** — headline + lede answer "who is this for and why should I care?"
- **2-minute read** — trust chain / standards / bridge / proof-of-delivery answer "how does it work?"

Per-route ladders are specified in MDX frontmatter (`eyebrow` = glance, `headline` + `lede` = scan, body = read).

### 8. User journeys

| Persona                  | Entry                               | Next                                                             | Outcome                                                |
| ------------------------ | ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| Developer evaluating     | `/` from GitHub/HN                  | Hero CTA "See a code example" → `/platform#identity` code block  | Clicks GitHub / reads launch post / bounces to `/docs` |
| CTO/architect comparing  | `/` from analyst/peer               | Nav "Platform" → pillar section → Standards chips → `/standards` | Reaches `/get-started` or sends GitHub link to a lead  |
| Standards-curious reader | `/standards` from IETF/W3C citation | DefinedTerm entry → "See our take" link → `/writing/[slug]`      | Subscribes to RSS / bookmarks                          |

### 9. Voice and tone (3 rules, review-enforced)

- **Say** "verifiable credentials", "OIDC", "token exchange". **Don't say** "identity solution", "enterprise-grade", "seamless", "unlock".
- **Say** protocol names without defining them inline; first mention links to a `StandardChip`. **Don't say** "a protocol called OID4VP".
- **Say** "When a user signs in" in explanatory intros. **Don't say** "imagine a world where…".

Caught at review, not lint.

### 10. Self-hosted fonts under `public/assets/fonts/` with payload budget

WOFF2 only. Variable fonts where available (Inter Tight, JetBrains Mono). `unicode-range` subsetting (Latin + Latin-Ext minimum). Preload exactly one face per route — **the LCP-critical face is Space Grotesk** for marketing routes (per DESIGN.md hero h1); pinned by Playwright assertion that `getComputedStyle(h1).fontFamily` matches the preloaded `@font-face`. Non-display families (Fraunces, Instrument Serif) load only on routes that use them. Metrics overrides (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) derived via `scripts/derive-font-metrics.mjs` and emitted in `theme.css` to neutralize FOUT CLS. `font-display: swap` for all faces; `optional` considered if metrics overrides aren't sufficient on the display face (Playwright CLS gate decides). **Payload budget enforced by `scripts/measure-font-payload.mjs`**: total per route ≤ 180 KB, per-family ≤ 60 KB. Lighthouse CI is a secondary gate, not the primary one.

### 11. Cascade layers in `theme.css`

```
@layer reset, tokens, utilities, components, overrides;
```

Component CSS (Astro scoped `<style>`) lands in the `components` layer. Token definitions in `tokens`. Utility classes in `utilities`. Overrides for targeted emergency fixes only.

### 12. Accessibility baseline

- WCAG 2.2 AA site-wide; AAA where cheap.
- Tap targets: **44 × 44 CSS px floor** (iOS HIG + WCAG 2.5.5 AAA), enumerated for `StandardChip`, hamburger toggle, GitHub icon-button, theme toggle, `TrustChainTooltip` close button, and any `<button>`/`<a>` inside `TrustChain` rows.
- Skip link is the first focusable element on every page; **activation moves focus into `<main>`** (lint enforced).
- Trust chain is an `<ol role="list">` of steps. Rows are `tabindex="0"` and operable by Enter/Space when expanded to a tooltip; an explicit info button is the only discoverable affordance for keyboard-only and switch users (redundant with hover but required).
- `TrustChainTooltip` is `role="dialog"` `aria-modal="false"`, Esc-dismissable site-wide, with rows carrying `aria-describedby` to the open tooltip's id.
- `TrustChain` cycling under `prefers-reduced-motion: reduce` stops on a complete PERMIT or DENY end-state (NEVER mid-transition); `aria-live` updates from cycling are suppressed.
- PERMIT/DENY/WARN outcomes carry a non-color signal (text label, icon shape, or ARIA state) in addition to color (WCAG 1.4.1).
- `forced-colors: active` keeps nav active-state, chip outline, hamburger toggle, trust-chain markers, and theme-toggle pressed state visible via system colors (no reliance on `backdrop-filter`/`box-shadow` for state).
- `prefers-reduced-motion: reduce` disables all non-essential motion and reduces tooltip transitions to opacity-only at ≤ 80 ms (no transform).
- `StandardChip` caption visible on `:hover` OR `:focus-visible` (desktop) AND default-visible on `@media (hover: none)` (touch).
- Theme toggle is a `<button aria-pressed>`; pre-paint script validates `localStorage.theme` against `['twilight', 'midnight']` allow-list before applying `data-theme`.

### 13. Structured data

`site-structured-data` capability emits Organization + WebSite sitewide (NO `potentialAction` SearchAction while `/search` is `noindex` — would generate Search Console warnings), Article + BreadcrumbList on writing posts (Article includes `publisher` resolved from sitewide Organization; missing `cover` emits a non-fatal Top Stories warning), and DefinedTerm per standards entry (entity/Knowledge Graph signal, not a triggered SERP rich-result feature).

JSON-LD via `JsonLd.astro` — uses `JSON.stringify` then Astro's interpolation (no `set:html`). Before interpolation, the payload escapes `<` as `&lt;` (also `>` and `&`) so user-controlled MDX strings cannot terminate the script element via `</script>` injection. `validate-structured-data.mjs` asserts no raw `</script>` substring inside any ld+json block in `dist/` AND enforces an aggregate ld+json size ceiling of 8 KB uncompressed per route. `JSON.stringify` runs without indent argument.

### 14. Sitemap + noindex + robots — single source

`site-indexation` capability regenerates `sitemap.xml` on build with `<lastmod>` bound to MDX `updated`/`published` frontmatter (NOT CI checkout mtime — `@astrojs/sitemap`'s default would tell Google every page updated on every deploy). The list of non-indexable routes lives in `src/lib/indexation.ts` `NOINDEX_ROUTES` as a typed `as const` array consumed by sitemap filter, BaseLayout `indexable` prop, robots.txt generator, and `validate-indexation.mjs` — single source prevents drift. Excluded routes emit `<meta name="robots" content="noindex, nofollow">`. `robots.txt` managed under this capability. `/_drafts/` filter remains in `astro.config.mjs`. `_redirects` destinations MUST be same-origin (begin with `/`); validator rejects `://` and `//`.

### 15. Branding: favicons, theme-color, OG images

`site-branding` capability: favicon set (192, 512, SVG, apple-touch), `theme-color` meta coordinated with `prefers-color-scheme` + `data-theme`, per-slug OG image generation pipeline (default fallback for pages without custom art).

### 16. Bridge sentence lint reframe

A strict "canonical sentence appears nowhere else" rule would force awkward paraphrase. Instead:

- Canonical sentence in `platform.mdx` frontmatter (`bridge.sentence`).
- Enumerated paraphrase allow-list in `bridge.variants[]`.
- Lint forbids _unauthorized_ paraphrases matching the sentence's key phrases but absent from the allow-list.
- Lint is AST-aware — skips code fences, comments, frontmatter.

### 17. ast-grep vs Node mjs split

- **ast-grep YAML rule under `rules/security/`** when the rule is single-AST-pattern over `.ts`/`.astro`/`.css` (e.g. raw color literal in CSS, inline wordmark SVG outside Nav/Footer, hardcoded secret pattern).
- **Node mjs script under `scripts/`** when the rule walks MDX, validates JSON-LD shape, parses HTML in `dist/`, or measures rendered output (e.g. font-metrics verify, structured-data validate, taglines single-source check across MDX + JSON).

This matches the project's existing convention (`AGENTS.md` AST-GREP section: `.astro` frontmatter is not covered by ast-grep — keep cross-file logic in mjs scripts).

### 18. CSP changes are additive, not restrictive

Adding `font-src 'self'` (was inherited from default `'self' data:` on the meta CSP) is a no-op tightening; removing third-party font hosts means the directive truly is `'self'`. The pre-paint theme-bootstrap inline script gets a SHA-256 hash entry — `scripts/csp.mjs` already supports this; the change just means the existing infrastructure runs on one more inline-script.

## Risks & Rollback

- **Risk:** Container queries still have partial support on older Safari. **Mitigation:** `@supports not (container-type: inline-size) { @media (max-width: 640px) }` fallback; Playwright runs at Safari-equivalent viewport.
- **Risk:** Theme token rename could break pages outside scope. **Mitigation:** Additive first — raw `--color-*` palette and semantic aliases added alongside existing variables; routes migrate via `<html data-theme>` switch, page by page.
- **Risk:** `STANDARDS` lint fires on pages that intentionally hardcode external references. **Mitigation:** Per-line `// lint-standards:allow` pragma; test fixture per linter proves no false positive on known patterns.
- **Risk:** Font metrics overrides are per-family and non-trivial to derive. **Mitigation:** `scripts/derive-font-metrics.mjs` automates measurement against the configured fallback font; `npm run verify-font-metrics` compares actual rendered metrics in a headless browser.
- **Risk:** Adding seven new capabilities expands the review surface. **Mitigation:** Each capability has a single owner group in CODEOWNERS; each delta scoped to one capability; revert in reverse order of `tasks.md`.
- **Risk:** Lychee href check on `STANDARDS.href` flakes on third-party standards sites. **Mitigation:** Per-build runs shape validation only; liveness check runs on a scheduled CI job (weekly), not blocking deploys.
- **Risk:** Astro 5 content-collection schema changes between minor versions. **Mitigation:** Pin `astro` patch version; CI runs `astro check`; rebuild on each `package-lock.json` PR via existing pipeline.

## Open Questions

- Does `/vision` adopt the new tokens via this change, or stay owned by `refactor-styling-architecture`? **Proposed:** stay there; this change only consumes the outputs.
- Does `twilight` remain the marketing-route default after `refactor-styling-architecture` ships? **Proposed:** yes; toggle exposes `midnight`.
- Do we ship a `/changelog` page for product releases? **Proposed:** out of scope; revisit after this change lands.
- Do we build author pages (`/about/[author]`)? **Proposed:** author collection ships (supports the writing UX); author pages deferred to a follow-up.
- Should the brand-icon gallery (`new-design/extracted/src/pages/brand-icons.html`) ship as `/brand` under this change, or as a separate `add-brand-gallery` change? **Proposed:** separate change — keeps this proposal focused on marketing routes.
