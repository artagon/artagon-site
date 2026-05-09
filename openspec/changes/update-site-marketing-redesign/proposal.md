## Why

The current `artagon-site` communicates the product at a surface level but under-sells the protocol-literate positioning that differentiates Artagon from generic IAM SaaS. Marketing copy, standards references, and the bridge narrative are scattered across `.astro` files, hard to edit without touching components, and inconsistent between the homepage, platform page, and footer. The HTML prototypes and `DESIGN.md` shipped under `new-design/extracted/` commit to a dark-editorial direction with five interaction primitives — trust chain, standards chips, claim/token/decision triad, bridge sentence, roadmap lanes — that are ready to port to Astro, but their mobile rendering relies on a global `transform: scale()` shim that makes type unreadable below ~720 px. The plan also closes structural gaps the current site has: no per-route canonical-URL emission, no JSON-LD, no skip link, no app-shell `noindex`, and no per-slug Open Graph image pipeline.

## What Changes

- **Redesign marketing routes** (`/`, `/platform`, `/roadmap`) and add three new routes (`/use-cases`, `/standards`, `/writing` + `/writing/[slug]` + `/writing/feed.xml`) using the prototype's visual system, delivered through Astro Content Collections.
- **Extend `style-system`** with cascade layers, fluid type via `clamp()`, container-query primitives, self-hosted WOFF2 fonts with `size-adjust` / `ascent-override` / `descent-override` / `line-gap-override` metrics to neutralize FOUT CLS, and a new `midnight` theme alongside the modified `twilight` theme. **MODIFIED** existing `Theme-Aware Fallback Tokens` requirement; ADDS new requirements; preserves existing UI Component Attribute Compatibility and Solid Card Variant requirements.
- **Create a typed `STANDARDS` registry** (`src/data/standards.ts`) with `StandardChip` / `StandardsRow` Astro primitives, consumed by hero, footer, and `/standards`, and emitted as `schema.org/DefinedTerm` JSON-LD.
- **Create a new `site-navigation` capability** codifying the primary nav (Platform · Use cases · Standards · Writing + GitHub icon), footer structure, mobile hamburger behavior, skip-link requirement, and per-route metadata emission contract.
- **Create a new `site-bridge-story` capability** with a single canonical sentence, an allow-listed paraphrase variants array, an accessible SVG flow diagram, a `#bridge` section on `/platform` surfaced via a hero CTA on `/`, and a 301 redirect from the legacy `/bridge` route.
- **Create a new `site-mobile-layout` capability** that replaces the global viewport-scale fallback with fluid type + container queries + a three-breakpoint contract.
- **Create a new `site-structured-data` capability** emitting Organization, WebSite, Article, BreadcrumbList, and DefinedTerm JSON-LD site-wide.
- **Create a new `site-indexation` capability** regenerating `sitemap.xml` on build, emitting `noindex` meta on app-shell routes (`/console`, `/search`, `/play`, `/404`), and managing `robots.txt`.
- **Create a new `site-branding` capability** with favicons at required sizes, `theme-color` meta coordinated per theme, and a per-slug Open Graph image pipeline.
- **Add nine build-time validators** wired into `npm run build` alongside the existing `sri.mjs` / `csp.mjs` postbuild: `lint-tokens.mjs`, `lint-taglines.mjs`, `lint-standards.mjs`, `lint-bridge.mjs`, `lint-meta.mjs`, `lint-skip-link.mjs`, `lint-brand.mjs`, `validate-structured-data.mjs`, `validate-indexation.mjs`. All linters are AST-aware (MDX/Astro), skip code fences and comments, and honor per-line `lint-*:allow` pragmas. Implement them as ast-grep YAML rules under `rules/security/` where the pattern fits a single-source-token rule, and as Node mjs scripts under `scripts/` where AST walking is required (MDX, JSON-LD shape).
- **Update CSP `font-src`** to `'self'` for marketing routes (self-hosted fonts); no runtime Google Fonts requests. Update `scripts/csp.mjs` to add hashes for the pre-paint theme-bootstrap inline script.
- **Adopt conversion guidance** at `docs/guides/new-design-conversion.md` (v3.2, post-3-round adversarial review). The doc consolidates the rules an automated converter must follow when porting `new-design/extracted/` to Astro: skill mandate (`tdd`/`typed-service-contracts`/`agent-dx-cli-scale`/`design-md`), CSP runtime blocker, `client:*` ban, `--nd-*` token rename contract, route map authority, BaseLayout preserve contract, and a per-component hook-location reference table. Tasks reference Phase 0.7.

## Scope Boundaries

**In Scope:**

- Redesign of `/`, `/platform`, `/roadmap`.
- Addition of `/use-cases`, `/standards`, `/writing`, `/writing/[slug]`, `/writing/feed.xml`.
- Removal of `/bridge` as a standalone route (301 redirect to `/platform#bridge`).
- Additive changes to `style-system`: cascade layers, fluid type, container queries, WOFF2 self-hosting with metrics overrides, token categories (motion, elevation, focus-ring, z-index, spacing, radius), `midnight` theme.
- New capabilities: `site-navigation`, `site-standards-registry`, `site-bridge-story`, `site-mobile-layout`, `site-structured-data`, `site-indexation`, `site-branding`.
- Mobile-responsive fixes on in-scope routes and on the HTML prototypes that serve as handoff reference under `new-design/extracted/`.
- One code example per Platform pillar (curl or TS SDK snippet, Shiki at build time).

**Out of Scope (declared explicitly with rationale):**

- **Internationalization** — no `hreflang`, no `/en/` prefix, no locale-switching UI. Rationale: i18n requires content duplication, routing changes, and a translation pipeline not in scope here. Follow-up change: `add-i18n-foundations`. The plan does add `<html lang="en">` and logical CSS properties (`padding-inline`, `margin-block`) so RTL is not blocked later.
- **`/vision` styling** — owned by the in-flight `refactor-styling-architecture` change; this change consumes the outputs.
- **Non-marketing routes** (`/faq`, `/developers`, `/docs`, `/console`, `/search`, `/get-started`, `/how`, `/status`, `/security`, `/privacy`, `/play`, `/404`) — UNCHANGED. Exception: `/console`, `/search`, `/play`, `/404` get `noindex` meta via `site-indexation`.
- **Docs-shell internal nav** and DocSearch config.
- **Backend / console-app UI.**
- **Full motion design system** — baseline only (`--motion-duration-fast`, `--motion-easing-standard`, `prefers-reduced-motion` disable). Full motion system deferred.
- **Per-standard deep pages** — registry supports deep linking via `#id` anchors on `/standards`; `/standards/[id]` pages are a follow-up.
- **Email subscribe / newsletter** — RSS feed at `/writing/feed.xml` ships in this change; subscribe UI deferred.
- **Interactive code playground** — `/play` already exists and is UNCHANGED.

## Risks and Rollback

- **Risk: Merge conflict with `refactor-styling-architecture`.** Both changes edit `public/assets/theme.css`. **Mitigation:** This change lands AFTER `refactor-styling-architecture` merges, AND `npm run verify:prerequisites` (Phase 0.x) fails the build unless `openspec/changes/refactor-styling-architecture/` is archived OR its merge commit is an ancestor of `HEAD`. CODEOWNERS pin on `theme.css`, `src/components/ui/**`, and `astro.config.ts` (pre-USMR-Phase-5.x this was `astro.config.mjs`; renamed to `.ts` so the config can import typed `BUILD` paths from `build.config.ts`) enforces sequential review while both are open. The script gate, not just review hygiene, blocks accidental merge order. See `design.md` Decision #1.
- **Risk: CLS from fluid type + `font-display: swap`.** Display headlines using `clamp()` can reflow tens of pixels on font swap. **Mitigation:** `@font-face` per self-hosted family MUST emit `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` derived from fallback-font metrics; `scripts/derive-font-metrics.mjs` automates measurement; `scripts/verify-font-metrics.mjs` gates CI. See `design.md` Decision #10.
- **Risk: Token rename affects out-of-scope routes (`/faq`, etc.).** **Mitigation:** Additive first — raw `--color-*` palette and semantic aliases added alongside existing variables; routes migrate via `<html data-theme>` switch, page by page.
- **Risk: Self-hosted fonts add bundle size.** **Mitigation:** WOFF2 only; `unicode-range` subsetting (Latin + Latin-Ext); variable fonts where available (Inter Tight, JetBrains Mono); preload only the LCP-critical display face (Space Grotesk per DESIGN.md, pinned by Playwright assertion); per-route total payload ≤ 180 KB and per-family ≤ 60 KB enforced by `scripts/measure-font-payload.mjs`. **Note:** the existing `lighthouserc.json` only collects `/` at `warn` severity, so Lighthouse alone does NOT enforce font budgets — `measure-font-payload.mjs` is the load-bearing gate.
- **Risk: Lint scripts false-positive on MDX prose.** **Mitigation:** AST-based linters that walk the MDX tree, skip code fences, comments, frontmatter; honor `// lint-*:allow` pragmas. Test fixture per linter proves no false positive on known patterns. Where a single-token enforcement fits ast-grep, prefer a YAML rule under `rules/security/` (matches existing project lint conventions).
- **Risk: Container-query partial support on older Safari.** **Mitigation:** `@supports not (container-type: inline-size)` fallback to `@media (max-width: 640px)`; Playwright visual snapshots at the fallback viewport.
- **Risk: SEO ranking loss from `/bridge` removal.** **Mitigation:** Explicit **301** redirect (not 302) covering `/bridge`, `/bridge/`, `/Bridge`, `/BRIDGE`, `/bridge.html` via the deploy host's redirect map (`public/_redirects` for Pages-compatible host, or HTTP redirect rule). Playwright verifies the 301 status.
- **Risk: SRI/CSP postbuild breaks on the new pre-paint theme script.** **Mitigation:** Add the hashed inline script to `scripts/csp.mjs`'s allowlist; `scripts/sri.mjs` already covers local JS/CSS. CI gate: build + verify `dist/sri-manifest.json` and CSP meta tag presence.
- **Risk: ast-grep rules drift if YAML doesn't match Astro frontmatter parsing.** **Mitigation:** Per `AGENTS.md`, security logic stays in `src/lib/*.ts`; linters that need to walk MDX/Astro frontmatter run as Node mjs scripts (not ast-grep YAML).
- **Risk: Lighthouse CI is currently warn-only and runs only on `/`.** Existing `lighthouserc.json` cannot fail CI on perf regressions in the new routes. **Mitigation:** A new requirement under `style-system` ("Lighthouse CI Performance Gate") mandates `lighthouserc.json` (a) lists every marketing route plus a representative `/writing/[slug]`, (b) sets perf to **`error` ≥ 0.9** (not warn), (c) asserts CWV thresholds: LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms, INP ≤ 200 ms. Block `tasks.md §12.2` on the config edit before any other Phase 12 task can complete.
- **Risk: Cross-cutting `BaseLayout.astro` edits from four capabilities (`site-navigation`, `site-structured-data`, `site-indexation`, `site-branding`) become sequential merge bottleneck.** **Mitigation:** A `BaseLayout.astro` slot ABI (`<JsonLd/>`, `<Indexation/>`, `<Branding/>`) is introduced under `site-navigation`'s scope; the other three capabilities consume the slots without further direct edits to `BaseLayout.astro` after Phase 3. Captured as `design.md` decision; tasks.md Phase 3 gates the slot ABI before Phases 9/10/11.
- **Rollback:** Each delta is scoped to one capability; revert in reverse order of `tasks.md` (content → nav → standards → style-system → bridge → mobile → structured-data → indexation → branding). Cross-cutting files (`BaseLayout.astro`, `theme.css`, `csp.mjs`) revert via tagged `pre-redesign` baseline pointed at the merge commit of `refactor-styling-architecture`; multi-phase reverts use the tag.

## Impact

- **Affected Specs:**
  - `site-content` — MODIFIED (routes table, content collections extension, canonical taglines, writing index, heading hierarchy per route, CTA inventory, latest-writing module, code-example requirement).
  - `style-system` — MODIFIED + ADDED (cascade layers, fluid type, container queries, WOFF2 + metrics overrides, font payload budget, LCP preload pin, token categories, existing-token preservation, `midnight` theme added alongside `twilight`, Lighthouse CI perf gate at error severity, Card Variant Set added without smuggling new variants into the MODIFIED `Solid Card Variant`). Existing requirements (Theme-Aware Fallback Tokens, UI Component Attribute Compatibility, Solid Card Variant) preserved verbatim under MODIFIED; new requirements under ADDED.
  - `site-navigation` — **New Capability** (primary nav, skip link, hamburger geometry + hydration, footer, metadata emission contract, active route indicator).
  - `site-standards-registry` — **New Capability** (typed registry, chip + row primitives, DefinedTerm emission, outbound-link policy, tooltip/summary split).
  - `site-bridge-story` — **New Capability** (canonical sentence + variants allow-list, SVG flow with a11y, `/platform#bridge` section, 301 redirect to `/platform` (no fragment, preserves PageRank), hero CTA on `/` retains the `#bridge` fragment for in-document scroll).
  - `site-mobile-layout` — **New Capability** (three-breakpoint contract, fluid type, container-query primitives, no global scale fallback).
  - `site-structured-data` — **New Capability** (Organization, WebSite, Article, BreadcrumbList, DefinedTerm JSON-LD).
  - `site-indexation` — **New Capability** (sitemap regeneration, noindex policy, robots.txt, RSS link rel="alternate").
  - `site-branding` — **New Capability** (favicons, theme-color per theme, OG image pipeline).

- **Affected Code (non-exhaustive):**
  - `src/content/config.ts`, `src/content/pages/*.mdx`, `src/content/pages/writing/*.mdx`, `src/content/authors/*.mdx`, `src/content/taglines.json`
  - `src/data/standards.ts` (new), `src/data/brand-colors.ts` (new)
  - `src/components/Header.astro` (replaces planned `Nav.astro`), `Footer.astro`, `SkipLink.astro`, `BridgeFlow.tsx` + `BridgeFlow.css` (React island, NOT the originally planned `BridgeFlow.astro`), `Standard.astro` (replaces planned `StandardChip.astro`), `StandardsWall.astro` (rolls in the planned `StandardsRow.astro` content), `TrustChainIsland.tsx` + `TrustChainIsland.css` (React island, NOT the originally planned `TrustChain.astro`), `PillarsIsland.tsx` + `PillarsIsland.css`, `UseCasesIsland.tsx` + `UseCasesIsland.css`, `RoadmapTimeline.astro`, `HomeExplore.astro`, `ArtagonGlyph.astro`, `ThemePreviewPanel.astro`, `Tweaks.astro`, `TweaksPanel.tsx` (new/updated). Out-of-scope drops vs original list: `Nav.astro` (consolidated into `Header.astro`), `JsonLd.astro` (replaced by inline `set:html={safeJsonLd(…)}` per `src/lib/charset.ts`), `TwoCol.astro` (deleted; layouts moved to scoped Astro `<style>` per component), `ThemeToggle.astro` (deleted in pt166 as orphan; theme switching exercised via `TweaksPanel.tsx`), `TrustChainTooltip.astro` (Planned for the §6.13 explain-layer follow-up; NOT in this change).
  - `src/layouts/BaseLayout.astro` (metadata emission)
  - `src/pages/` routes added: `/use-cases`, `/standards`, `/writing/index.astro`, `/writing/[slug].astro`, `/writing/feed.xml.ts`; `/bridge.astro` removed
  - `public/assets/theme.css` (cascade layers + tokens), `public/assets/fonts/*` (WOFF2 + `LICENSE.txt`), `public/robots.txt`, `public/_redirects`, `public/favicon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
  - `scripts/lint-tokens.mjs`, `scripts/lint-taglines.mjs`, `scripts/lint-standards.mjs`, `scripts/lint-bridge.mjs`, `scripts/lint-meta.mjs`, `scripts/lint-skip-link.mjs`, `scripts/lint-brand.mjs`, `scripts/validate-structured-data.mjs`, `scripts/validate-indexation.mjs`, `scripts/derive-font-metrics.mjs`, `scripts/verify-font-metrics.mjs`, `scripts/measure-font-payload.mjs`, `scripts/verify-prerequisites.mjs`, `scripts/generate-og-images.mjs`, `scripts/generate-manifest.mjs` (new); `scripts/csp.mjs` (updated to hash the pre-paint theme script and to enforce no `'unsafe-inline'` plus orphan-hash detection).
  - `src/lib/indexation.ts` (new) — `NOINDEX_ROUTES` single source consumed by sitemap filter, BaseLayout, robots.txt, validator.
  - `rules/security/*.yaml` — additions where the rule fits ast-grep (e.g. inline-wordmark ban, raw-hex literal in `.css`).
  - `package.json` build pipeline (lint + gen scripts wired into `postbuild`).
  - `astro.config.mjs` (`@astrojs/sitemap` excludes).
  - `openspec/project.md` and `openspec/config.yaml` (route list and capability inventory).

- **Affected Docs:**
  - `openspec/project.md` — routes list and capability inventory.
  - `openspec/config.yaml` — context block updated with new capabilities.
  - `README.md` — new routes, theme toggle, writing/RSS info.
  - Architectural decisions recorded in archived change after merge per `openspec/contributing.md` workflow.
