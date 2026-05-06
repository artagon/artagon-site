# Tasks — update-site-marketing-redesign

> Numbered for cross-reference from `proposal.md`, `design.md`, and capability deltas. Each task lists files touched and the acceptance signal. Tasks within a phase MAY parallelize; phases MUST land in order.

## Phase 0 — Pre-flight

- [x] 0.1 Confirm `refactor-styling-architecture` has merged; rebase on `main`. → ✅ archived at `openspec/changes/archive/2026-05-04-refactor-styling-architecture/` (merged via PR #39).
- [x] 0.2 Resolve any `public/assets/theme.css` token-name conflicts; if rename needed, update §6 token names. → ✅ audit found exactly **2 collisions**: `--accent` and `--bg` (live theme.css 95 tokens; upstream `new-design/extracted/src/styles/tokens.css` 19 tokens; `comm -12` overlap = 2). Phase 2 token-rename contract handles these via `--nd-accent`/`--nd-bg` prefixes per the conversion guidance doc; no §6 spec rename needed since both collisions stay namespaced.
- [x] 0.3 `openspec validate update-site-marketing-redesign --strict` — fix all schema issues. → ✅ green.
- [x] 0.4 Confirm CODEOWNERS includes the nine new capability dirs and the cross-cutting files (`public/assets/theme.css`, `src/layouts/BaseLayout.astro`, `astro.config.ts` (was `astro.config.mjs` pre-Astro-6 — actual file in this repo is `.ts`), `scripts/csp.mjs`, `scripts/sri.mjs`). → ⚠️ pre-audit state: CODEOWNERS had `astro.config.ts` + `csp.mjs` + `sri.mjs` but missing `BaseLayout.astro` + `theme.css`. **Fixed in this PR** (Phase-0 commit).
- [x] 0.5 Build `scripts/verify-prerequisites.mjs` (`npm run verify:prerequisites`): fails the build unless `openspec/changes/refactor-styling-architecture/` is archived OR its merge commit is an ancestor of `HEAD`. Wire into postbuild + PR CI. → ✅ shipped: 4-state script (a/b/c/d) covering archived / archived+ancestor / orphan-tree / in-flight. 5 node:test cases. Wired into `package.json` postbuild + `.github/workflows/design-md-lint.yml`.
- [x] 0.6 Tag the pre-redesign baseline of `BaseLayout.astro`, `theme.css`, and `csp.mjs` as `pre-redesign` once `refactor-styling-architecture` archives — used by the multi-phase rollback path documented in `proposal.md`. MUST `git push origin pre-redesign` so fresh CI clones see the tag (local-only tags break CI rollback). Add a CI pre-merge check `git rev-parse --verify pre-redesign 2>/dev/null` to confirm the tag exists on origin before any Phase 2+ task can run. → ✅ annotated tag created at `0e05105` (head of main post PR #40), pushed to origin (`refs/tags/pre-redesign` → SHA `462482e`). The CI pre-merge check is a follow-up task for Phase 2 (no Phase 2 tasks land in this PR).

- [x] 0.7 Adopt the conversion guidance prompt at `docs/guides/new-design-conversion.md` (v3.2, post-3-round adversarial review by Claude/Codex/Gemini). → ✅ doc shipped at `docs/guides/new-design-conversion.md` (391 lines). Note: section v3.2's React-island guidance was further updated in commit `290f111` (during PR #39) to permit React islands, since `@astrojs/react@5.0.4` was installed for the Tweaks panel — the React-NOT-installed clause below is **superseded by current state** but kept as historical context. The current React-island posture is documented in the conversion guide itself. Mandates from v3.2:
  - **Skill mandate**: load `tdd`, `typed-service-contracts`, `agent-dx-cli-scale`, and `design-md` skills from `.agents/skills/` before any conversion edit.
  - **CSP runtime blocker**: new-design HTML mocks load `unpkg.com` React/Babel CDN (e.g. `new-design/extracted/src/pages/index.html` lines 429-431) and Google Fonts CDN. Live CSP at `scripts/csp.mjs:23` is `script-src 'self'` + hashes only. Any conversion that copies mock script tags verbatim breaks runtime even if build passes. Self-host fonts under `public/assets/fonts/` per Phase 2.3 BEFORE running first page conversion.
  - **React-island guidance**: `@astrojs/react` is NOT YET installed. React islands are PERMITTED — and expected for forward-looking interactive surfaces (`/play` playground, `/console` admin, `/search` typeahead, hero trust-chain animation, Bridge SVG carousel). For each island, document the cost (bundle bytes, CSP/SRI hash regen, dep additions: `@astrojs/react` + `react` + `react-dom` + `@types/react` + `@types/react-dom`) in the conversion commit. Prefer cheaper alternatives (CSS-only `:checked`/`:has()`/`<details>`/`popover` API, vanilla `<script>` blocks, or web components like `src/scripts/tweaks.ts`) when they suffice. Marketing routes (`/`, `/platform`, `/vision`, `/roadmap`, etc.) STAY static — only interactive surfaces hydrate. Self-host all WOFF2 fonts under `public/assets/fonts/` to keep CSP `font-src 'self'` (no Google Fonts CDN).
  - **Full absorption**: USMR replaces the live marketing surface with the new-design content. Every page in `src/pages/` corresponds 1:1 with a conversion target; once USMR archives, `new-design/extracted/` becomes a historical reference and may be removed in a follow-up `cleanup-new-design-extracted` change. There is no dual-tree state — either content lives in `src/` or it does not exist on the live site.
  - **Token rename contract**: before merging `new-design/extracted/src/styles/tokens.css`, sed-rename ALL its tokens to `--nd-*` prefix (`--bg` → `--nd-bg`, `--accent` → `--nd-accent`, etc.). Append the renamed block to `public/assets/theme.css` under `/* ===== NEW-DESIGN TOKENS (OKLCH) ===== */`. Per-converted-page, alias old tokens via `:root[data-theme="midnight"] { --bg: var(--nd-bg); }` ONLY after visual verification. Never merge new-design tokens directly into a plain `:root {}` block — it would shadow the three live theme packs (`midnight`/`twilight`/`slate`).
  - **Route map authority**: live routes are NESTED at `src/pages/<route>/index.astro` (14 of 16); only `index.astro` and `404.astro` are flat. Conversion replaces page CONTENT but MUST preserve the route paths. New-design's HTML mocks have non-overlapping routes (`bridge`, `blog`, `brand-icons`, `use-cases`, `standards`, `post-*.html`) — do NOT create new routes outside the 16 live routes + 4 USMR-added routes (`/use-cases`, `/standards`, `/writing/[slug]`, `/writing/feed.xml`). Discard `bridge.html` (merged into `/platform#bridge`), `blog.html` (superseded by `/writing/[slug]`), `brand-icons.html` (defer to `add-brand-assets-and-writing-pipeline`).
  - **BaseLayout preserve contract**: lines 16-37 of `src/layouts/BaseLayout.astro` are the pre-paint theme-persistence script — DO NOT touch (theme flash if removed). All 4 slots (`head`, `header`, default body, `footer`) must remain.
  - **Hook-location reference**: the v3.2 prompt has a per-component table at `new-design/extracted/src/components/*.jsx` of every `useState`/`useEffect`/`setInterval` line and the recommended Astro alternative. Use it verbatim during conversion.

## Phase 1 — Capability scaffolding

- [x] 1.1 Spec deltas live under `openspec/changes/update-site-marketing-redesign/specs/{site-content,site-navigation,style-system,site-standards-registry,site-bridge-story,site-mobile-layout,site-structured-data,site-indexation,site-branding}/spec.md`. → ✅ all 9 delta directories present and `openspec validate --strict` green.
- [x] 1.2 Update `openspec/project.md` with new routes, new capabilities, merge-order note with `refactor-styling-architecture`. → ✅ Capabilities + Merge order sections added; routes list extended with `/use-cases`, `/standards`, `/writing/[slug]`, `/writing/feed.xml`; stale `dist/` paths corrected to `.build/dist/`; tech stack updated (MDX, Content Collections + Zod, Playwright, ast-grep, `@astrojs/react`).
- [x] 1.3 Update `openspec/config.yaml` context block with new capability names. → ✅ Stale "Active in-flight change: refactor-styling-architecture" block replaced with current Live capabilities + In-flight changes + Merge order. Layout section notes USMR additions (writing collection, named slots, theme packs).
- [x] 1.4 `openspec validate update-site-marketing-redesign --strict` passes — gate before any code lands. → ✅ green at this commit.

## Phase 2 — Design-system foundations (style-system)

- [~] 2.1 Add raw OKLCH palette + semantic aliases + token categories (motion, elevation, focus-ring, z-index, spacing, radius) to `public/assets/theme.css` behind cascade layers `@layer reset, tokens, utilities, components, overrides`. (NEW tokens are layered; ~150 legacy `:root` declarations remain unlayered to preserve cascade priority per "Existing Token Preservation". Spec language `"All token definitions MUST live in tokens layer"` will be reconciled by stub change `openspec/changes/migrate-legacy-tokens-to-layer/` (filed; authoring deferred until USMR archives).)
- [~] 2.2 Define `twilight` (modified — extends existing requirement) and `midnight` (new) under `[data-theme="..."]`. (Theme blocks defined; theme-aware fallbacks via `--brand-teal-rgb` per-theme. Axe-core verification deferred — `@axe-core/playwright` not yet installed; lands with the broader Playwright/axe install in Phase 6 quality gates.)
- [ ] 2.3 Self-host WOFF2 fonts under `public/assets/fonts/` (Inter Tight, Space Grotesk, Fraunces, Instrument Serif, JetBrains Mono); subset with `unicode-range`; ship `LICENSE.txt`. Non-display families (Fraunces, Instrument Serif) MUST NOT load on routes that don't use them. → **superseded** by `self-host-woff2-fonts` Phase 1 (tasks 1.1–1.6) — that change owns binary download, subsetting, LICENSE.txt, CHECKSUMS, and the `public/assets/fonts/UPSTREAM` provenance file. Closes here when SHWF Phase 1 ships.
- [ ] 2.3a Emit exactly one `<link rel="preload" as="font" type="font/woff2" crossorigin>` per route, pinned to the LCP-critical face (Space Grotesk for marketing routes per DESIGN.md). Playwright asserts `getComputedStyle(document.querySelector('h1')).fontFamily` resolves to the preloaded family. → **superseded** by `self-host-woff2-fonts` Phase 4 (tasks 4.1–4.3) — `BaseLayout.astro` accepts `preloadFonts?: string[]` (default `["space-grotesk/500-normal"]`); per-route preload count is 1–2 (1 for marketing, 2 for `/writing/*` long-form); Playwright test lives at `tests/font-loading.spec.ts`. Closes here when SHWF Phase 4 ships.
- [ ] 2.3b Build `scripts/measure-font-payload.mjs` (`npm run measure:font-payload`): fails the build if total WOFF2 per route exceeds 180 KB OR per-family exceeds 60 KB. Wire into postbuild. → **superseded** by `self-host-woff2-fonts` Phase 5 (tasks 5.1–5.3). Closes here when SHWF Phase 5 ships.
- [ ] 2.4 `@font-face` blocks emit `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` derived from fallback-font metrics. → **superseded** by `self-host-woff2-fonts` Phase 3 (tasks 3.1–3.3) — typography section added to `theme.css` with full override quad; values populated by `derive:font-metrics --write`. Closes here when SHWF Phase 3 ships.
- [ ] 2.5 Build `scripts/derive-font-metrics.mjs` and `scripts/verify-font-metrics.mjs`; wire into `npm run verify`. → **superseded** by `self-host-woff2-fonts` Phase 2 (tasks 2.1–2.4) — both scripts plus tests + npm scripts. Closes here when SHWF Phase 2 ships.
- [x] 2.6 Emit fluid-type `clamp()` scale per `design.md` §6 table; floors at 360 px, ceilings at 1440 px.
- [x] 2.7 Update CSP `font-src` to `'self'` only — remove any third-party host. Update `scripts/csp.mjs` accordingly.
- [~] 2.8 Build `scripts/lint-tokens.mjs` (forbid hex/rgb/hsl/oklch literals, raw px/em/rem, spacing magic numbers in `.astro`/`.css`/`.mdx` outside `public/assets/theme.css`). Where the rule fits ast-grep, add a `rules/security/no-raw-color-literal.yaml` instead. (Color subset implemented + ast-grep companion rule shipped. Spacing/sizing enforcement (raw px/em/rem) deferred to Phase 12 quality gates — requires designing the allowlist for legitimate uses (line-height: 1.5, calc() math, clamp() formulas). Tracked in `openspec/changes/migrate-legacy-tokens-to-layer/` Phase 0.2.)
- [~] 2.9 Wire `lint:tokens` and `verify:font-metrics` into `npm run postbuild` and CI. (`lint:tokens` wired; `verify:font-metrics` wiring **superseded** by `self-host-woff2-fonts` Phase 6 task 6.1, which owns the full postbuild chain `verify:prerequisites && verify:design-prerequisites && lint:tokens && verify-font-self-hosting && verify:font-metrics && measure:font-payload && verify:font-subset-coverage && sri && csp && lint:design && lint:design-md-uniqueness`. Closes here when SHWF Phase 6 ships.)

## Phase 3 — Navigation + site chrome (site-navigation)

- [x] 3.0 Define the BaseLayout slot ABI: add `<slot name="json-ld">`, `<slot name="indexation">`, `<slot name="branding">` to `BaseLayout.astro`. After this lands, Phases 9, 10, 11 use `<JsonLd/>`, `<Indexation/>`, `<Branding/>` wrapper components and DO NOT directly edit `BaseLayout.astro`. → ✅ three named slots added to `<head>` after `<slot name="head">`; preceding pre-paint theme-persistence script (lines 17-38) untouched per Phase-0 contract; 4 existing slots (`head`, `header`, default, `footer`) preserved.
- [~] 3.1 `Nav.astro`: wordmark + 4 nav items (Platform · Use cases · Standards · Writing) + GitHub icon; `aria-current="page"`; sentence case; sticky 64 px backdrop-blurred. → ✅ component + chrome shipped; grid-based `auto 1fr auto` layout; `color-mix(in srgb, var(--bg) 72%, transparent)` backdrop-blur; accent underline on active/hover; GitHub Octicon icon-button (34×34, bordered square); all CSS tokens via `var(--*)` (no hex fallbacks); focus-visible rings; `@media (max-width: 640px)` collapses links (hamburger deferred to 3.3/3.4). **Route-list deferred:** spec calls for 4 items (Platform · Use cases · Standards · Writing) but `/use-cases`, `/standards`, `/writing` ship in USMR Phase 4-5. Live-only nav (Platform · Vision · Roadmap · Docs) shipped in the interim to keep lychee green; restore the spec'd 4 items when Phase 4-5 routes exist.
- [~] 3.2 `SkipLink.astro` + `<main id="main-content" tabindex="-1">` wrapper in `BaseLayout.astro`. Skip link is first focusable element. Activation moves focus into `<main>` (verified by `scripts/lint-skip-link.mjs` AND a Playwright scenario asserting `document.activeElement === main` after click). → ✅ `SkipLink.astro` shipped at `src/components/SkipLink.astro` with optional `href` / `label` props; `BaseLayout.astro` `<main>` now `id="main-content" tabindex="-1"`; lint side of acceptance covered by 3.9. Playwright `document.activeElement === main` assertion deferred — lands with the Phase 6 quality-gates Playwright bundle (axe + visual regression).
- [ ] 3.3 CSS-only hamburger baseline (checkbox pattern) for `< 720 px`.
- [ ] 3.4 `NavToggle.astro` progressively-enhanced Astro island (button + aria + focus trap + Esc close + reduced-motion respect).
- [x] 3.5 `Footer.astro`: 4-column layout (Platform · Developers · Company · Legal) + tagline + theme toggle + auto-year copyright + version string `v{semver} — build {7-char git sha}`. → ✅ `src/components/Footer.astro` replaced; brand column (wordmark + `tagline.positioning` + ThemeToggle); 4 link columns (Platform: /platform, /vision, /roadmap · Developers: /docs, /developers, /play, /status · Company: /faq, /get-started, /how · Legal: /privacy, /security, /security.txt) — restricted to live routes; `/use-cases`, `/standards`, `/writing` deferred to Phase 4-5; meta strip (`© {YEAR} Artagon, Inc. — Philadelphia, PA` · "Built on Astro · Open-source core · Apache 2.0" · `v{version} — build {7-char sha}`); SHA prefers `process.env.GITHUB_SHA` (CI) → `git rev-parse --short HEAD` (local) → `'unknown'` fallback; spacing via `var(--space-*)` tokens; responsive 2-col at ≤860px.
- [x] 3.6 `ThemeToggle.astro` `<button>` Astro island with `aria-pressed` reflecting active theme + inline pre-paint script (CSP-hashed) reading `localStorage.theme`, validating against allow-list `['twilight', 'midnight']`, falling back to `twilight` on any other value, and applying `<html data-theme>` via `setAttribute` only (no `innerHTML`/`outerHTML`/string-concatenated attribute construction). Update `scripts/csp.mjs` to include the new inline-script SHA-256 AND to fail the build if any inline `<script>` SHA-256 in `dist/` is not present in the emitted `script-src` directive (orphan-hash detection); forbid `'unsafe-inline'`. → ✅ `ThemeToggle.astro` rewritten as `<button data-theme-toggle>` with sun/moon SVG icons (CSS-toggled by `aria-pressed`); `is:inline` pre-paint aria-sync script + bundled click handler; all mutations via `setAttribute` only; allow-list `['midnight','twilight']` enforced at every entry point. `BaseLayout.astro` pre-paint validates `localStorage.theme` against the same allow-list; out-of-list values collapse to `twilight` (project default). Static `<html data-theme="twilight">` flipped from `midnight` to match the new default. `__setTheme` mirror validates and syncs `aria-pressed` on every `[data-theme-toggle]` button. `scripts/csp.mjs` orphan-hash detection: after building policy, verifies (a) `'unsafe-inline'` not in `script-src`, (b) every inline script SHA-256 is present in `script-src`; post-write self-audit re-reads each `.html` file and re-extracts hashes, throwing if any orphan slipped through cheerio's serialize cycle. `csp.mjs` exports `buildPolicy`, `extractScriptSrcHashes`, `sha` for unit testing (guarded with `process.argv[1] === fileURLToPath(import.meta.url)`); `tests/csp.test.mjs` (8 cases) covers helper round-trip, orphan detection, and `'unsafe-inline'` exclusion. Dev-only `ThemePreviewPanel.astro` reduced to `['twilight','midnight']` to match the production allow-list.
- [ ] 3.7 `SiteHead.astro` (or extend `BaseLayout.astro`): title, description, canonical (path-only check at lint), viewport, OG/Twitter, robots prop, favicons.
- [ ] 3.8 `scripts/lint-meta.mjs`: description 80–160 chars, canonical present (path-only against `https://artagon.com`, no `?` query strings), exactly one `<h1>` per page, and writing posts have a non-skipping h1→h2→h3 ladder.
- [x] 3.9 `scripts/lint-skip-link.mjs` (or Playwright equivalent): every built page in `dist/` has skip link as first tabbable element. → ✅ shipped at `scripts/lint-skip-link.mjs`; reads dist root from `build.config.json` (`.build/dist/`); walks all `*.html`; asserts first focusable element in `<body>` is a `class="skip-link"` anchor AND its `href="#<id>"` target id exists on the page; npm script `lint:skip-link`; wired into `postbuild` chain after `csp` and before `lint:design`. Verified locally against `.build/dist/` (16 pages, all pass).
- [x] 3.10 `scripts/lint-taglines.mjs`: enforce single source for `tagline.short` and `tagline.triad` from `src/content/taglines.json`. → ✅ `src/content/taglines.json` created with `tagline.{positioning,full,short,abbr,inline,triad}`; `scripts/lint-taglines.mjs` walks `src/**/*.{astro,ts,tsx,mjs}` (excludes `.mdx` prose); flags any file containing a guarded string verbatim; exit 0/1/2 contract; npm script `lint:taglines`; wired into `postbuild` after `lint:skip-link`; `tests/lint-taglines.test.mjs` (7 cases); `Tagline.astro`, `SeoTags.astro`, `src/pages/index.astro` updated to import from taglines.json — all 47 source files now pass.

## Phase 4 — Content collections (site-content)

- [x] 4.1 Extend Zod schemas in `src/content/config.ts` for `pages`, `pages/writing`, and `authors` collections (eyebrow, headline, lede, CTAs[], heroFont?, accent?, tags[]). → ✅ `src/content/config.ts` created (no prior file). `pages` schema requires `title`, `description`, `eyebrow`, `headline`, `lede`, `ctas[]` per spec site-content §"Type-Safe Content Schemas"; accepts optional `heroFont` (`space-grotesk` / `fraunces` / `inter-tight`), `accent`, `tags[]`. `writing` sub-collection extends `pages` with required `published` (z.coerce.date) and accepts optional `updated`, `cover`, `repo` (z.url), `author`, `draft` (default false). `authors` collection requires `name`, `slug`; accepts optional `bio`, `avatar`, `links[]` (each `{label,href}` with z.url). `cta` shape: `{label, href, rel?, variant?}` where variant ∈ `primary|secondary|ghost`. Existing `vision.mdx` migrated to satisfy the new contract (added `eyebrow`, `headline`, `lede`, `ctas[]`; description rewritten to 155 chars (within the lint-meta 80–160 band)). Build passes Zod validation; `pages/writing/` and `authors/` collections inert until populated in Phase 4.2 / 4.5.
- [ ] 4.2 Author `src/content/pages/{home,platform,use-cases,standards,roadmap,writing}.mdx` with frontmatter per `design.md` §4.
- [ ] 4.3 Add `bridge: { sentence, variants[] }` frontmatter to `platform.mdx`.
- [ ] 4.4 Author `src/content/taglines.json` with `tagline.short` (≤ 60 chars) and `tagline.triad` (3 clauses).
- [ ] 4.5 Sample `src/content/pages/writing/welcome.mdx` (non-draft) to exercise the writing detail route.
- [ ] 4.6 Wire `/writing`, `/writing/[slug]`, `/writing/feed.xml` (`@astrojs/rss`).
- [ ] 4.7 Update `openspec/specs/site-content/spec.md` Purpose line during archive (replace TBD).

## Phase 5 — Marketing routes (site-content + style-system)

- [ ] 5.1 `/` hero (eyebrow · headline · lede · CTAs · trust-chain artefact) + on-ramp card + pillar grid + standards row + latest-writing strip + latest-roadmap-update card.
- [ ] 5.2 `/platform` REDESIGN: pillar tri-band (Identity · Credentials · Authorization) + `#bridge` section + inline code examples per pillar via Shiki at build time.
- [ ] 5.3 `/use-cases` ADD: scenario cards, one references `/platform#bridge`.
- [ ] 5.4 `/standards` ADD: registry-driven sections + TOC anchor list.
- [ ] 5.5 `/writing` ADD: index, sorted by `published` desc, empty state if no posts.
- [ ] 5.6 `/writing/[slug]` ADD: breadcrumb, TOC sidebar if ≥ 3 `<h2>`, related posts (2-up), RSS CTA.
- [ ] 5.7 `/roadmap` REDESIGN: lanes (now / next / later) + latest-update card reused on home.

## Phase 6 — Standards registry (site-standards-registry)

- [ ] 6.1 `src/data/standards.ts` typed registry with initial 8 entries (IETF GNAP, OpenID OID4VC, FIDO2, W3C DIDs, W3C VCs, NIST 800-63, eIDAS 2, RFC 9449 DPoP) + versions + summaries + longSummaries + extends/uses graph + `lastVerified?` ISO date.
- [ ] 6.2 `StandardChip.astro`: mono label, external icon, `target="_blank" rel="noopener noreferrer"`, desktop hover + mobile-visible caption via `@media (hover: none)`, ≥ 44 px tap target via hit-area padding.
- [ ] 6.3 `StandardsRow.astro`: `<ul role="list">` render.
- [ ] 6.4 `/standards` page consumes the registry as the single source.
- [ ] 6.5 Hero + footer consume the registry — no hand-rolled standards links.
- [ ] 6.6 `scripts/lint-standards.mjs` (AST-aware `.astro` / `.mdx` / `.ts`; skips code fences, comments, frontmatter; honors `// lint-standards:allow` pragma).
- [ ] 6.7 Configure `lychee.toml` weekly scheduled job for `STANDARDS[*].href`; exclude from per-PR Lychee.

## Phase 7 — Bridge story (site-bridge-story)

- [ ] 7.1 Canonical `bridge.sentence` + `bridge.variants[]` allow-list in `platform.mdx` frontmatter.
- [ ] 7.2 `/platform#bridge` section + `BridgeFlow.astro` SVG diagram with `role="img"`, `<title>`, `<desc>`; semantic emphasis (not color-only); `forced-colors` mode tested.
- [ ] 7.3 `scripts/lint-bridge.mjs` (AST-aware, phrase-count heuristic, allow-list).
- [ ] 7.4 Deploy-host redirect: `/bridge` (and case/trailing-slash variants) → `/platform#bridge` (301). Add `public/_redirects`.
- [ ] 7.5 `/get-started#bridge` onboarding path + curl example (Phase 5 dependency).
- [ ] 7.6 `tests/bridge.spec.ts`: canonical sentence appears exactly once on `/platform`; never verbatim elsewhere; 301 verified for `/bridge` variants.

## Phase 8 — Mobile layout (site-mobile-layout)

- [ ] 8.1 Remove global `transform: scale()` fallback from any prototype page that still uses it (under `new-design/extracted/`).
- [ ] 8.2 Implement `TwoCol.astro`, `ThreeCol.astro`, `CodePair.astro`, `PillarGrid.astro` with container queries + `@supports` fallbacks.
- [ ] 8.3 `TrustChain.astro` primitive: `<ol role="list">`, stacks vertically `< 720 px`, no tab-stop on non-interactive `<li>`. `TrustChainTooltip.astro` per `DESIGN.md §4.13`.
- [ ] 8.4 Audit hero, standards row, bridge diagram at 360 / 480 / 720 / 1080 / 1440 px; fix overflow, clipping, tap-target violations (≥ 44 × 44 CSS px).
- [ ] 8.5 `tests/mobile-layout.spec.ts`: no horizontal overflow at 360 px, 44 px tap targets, single h1, skip-link first-tabbable, hamburger present `< 720 px`.
- [ ] 8.6 Migrate any legacy HTML mocks under `new-design/extracted/` onto tokens + primitives; delete `transform: scale()` blocks.

## Phase 9 — Structured data (site-structured-data)

- [ ] 9.1 `JsonLd.astro` helper with HTML-safe escape (no `set:html`; uses `JSON.stringify` + Astro's safe `<script type="application/ld+json">{json}</script>` pattern).
- [ ] 9.2 Sitewide Organization + WebSite JSON-LD emitted via `<JsonLd/>` wrapper into `BaseLayout.astro`'s `<slot name="json-ld">` (no direct BaseLayout edit). WebSite block does NOT include `potentialAction` SearchAction while `/search` is `noindex`.
- [ ] 9.3 Article + BreadcrumbList on `/writing/[slug]`. Article MUST include `publisher` resolved from sitewide Organization. Missing `cover` frontmatter emits a non-fatal build warning naming Top Stories ineligibility.
- [ ] 9.4 DefinedTerm / DefinedTermSet on `/standards`.
- [ ] 9.5 `scripts/validate-structured-data.mjs`: parse built HTML in `dist/`, validate JSON shape, required fields, absolute URLs, ISO dates, **assert no raw `</script>` substring inside any `<script type="application/ld+json">` block** (escape `<` as `&lt;` before interpolation in `JsonLd.astro`), **enforce aggregate ld+json size ≤ 8 KB uncompressed per route**, **`Article.publisher` matches sitewide Organization**.
- [ ] 9.6 (Optional) scheduled Google Rich Results check via GitHub Action.

## Phase 10 — Indexation (site-indexation)

- [ ] 10.0 Create `src/lib/indexation.ts` exporting `NOINDEX_ROUTES = ['/console', '/search', '/play', '/404'] as const`. Consumed by sitemap filter, BaseLayout `indexable` prop, robots.txt generator, and `validate-indexation.mjs` — single source.
- [ ] 10.1 Configure `@astrojs/sitemap` `filter` (consumes `NOINDEX_ROUTES`) AND `serialize` hook (binds `<lastmod>` to MDX `updated`/`published` frontmatter, NOT CI mtime) in `astro.config.mjs`.
- [ ] 10.2 `BaseLayout.astro` `indexable` prop; default true; set false on `/console`, `/search`, `/play`, `/404`.
- [ ] 10.3 Author `public/robots.txt`.
- [ ] 10.4 Confirm `astro.config.mjs` `trailingSlash: 'never'` (already set).
- [ ] 10.5 Author `public/_redirects` (or host equivalent) with the bridge 301 + any other moves.
- [ ] 10.6 `tests/redirects.spec.ts`: 301 on `/bridge` variants.
- [ ] 10.7 `scripts/validate-indexation.mjs`: meta-robots presence/absence per route (against `NOINDEX_ROUTES`); `<lastmod>` parity with frontmatter; `public/_redirects` destinations are same-origin (begin with `/`, no `://`, no `//`).
- [ ] 10.8 RSS `<link rel="alternate">` in `BaseLayout.astro`.

## Phase 11 — Branding (site-branding)

- [ ] 11.1 Generate favicon set (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, optional `mask-icon.svg`).
- [ ] 11.2 `src/data/brand-colors.ts` constants — single source for theme-color and OG.
- [ ] 11.3 `scripts/generate-manifest.mjs` writes `public/site.webmanifest` from `brand-colors.ts`.
- [ ] 11.4 `theme-color` meta with `media="(prefers-color-scheme: dark)"` / `light`.
- [ ] 11.5 `scripts/generate-og-images.mjs` (satori-based) + fallback template; runs pre-build; per-slug OG outputs cached.
- [ ] 11.6 OG/Twitter meta in `BaseLayout.astro`.
- [ ] 11.7 Wordmark SVGs under `public/assets/brand/`.
- [ ] 11.8 `scripts/lint-brand.mjs` (or `rules/security/no-inline-wordmark.yaml`): forbid inline wordmark SVG outside `Footer.astro` and `Nav.astro`.

## Phase 12 — Quality gates

- [ ] 12.1 Playwright: cover smoke (h1 visible per route), bridge canonical sentence, 301 redirects, mobile layout, accessibility (`@axe-core/playwright`), trust-chain ARIA, theme toggle persistence.
- [ ] 12.2 **Edit `lighthouserc.json` first** (gates the rest of Phase 12): set `collect.url` to every marketing route plus `/writing/[slug]`; set assertions to `error` severity (not warn) at perf ≥ 0.9, a11y ≥ 0.95, SEO ≥ 0.95, best-practices ≥ 0.95; assert CWV: LCP ≤ 2500 ms, CLS ≤ 0.1, TBT ≤ 200 ms, INP ≤ 200 ms. Run desktop + mobile emulation. The current warn-only `/`-only config is a Critical defect — every other Phase 12 task assumes Lighthouse can fail CI.
- [ ] 12.3 CLS budget < 0.1 on every marketing route (Playwright measurement gate).
- [ ] 12.4 `@axe-core/playwright` sweep — zero serious violations.
- [ ] 12.5 SRI + CSP postbuild (`scripts/sri.mjs`, `scripts/csp.mjs`) still green; CSP hash list updated for the pre-paint theme script.
- [ ] 12.6 Lychee internal-only on PR; weekly full run.
- [ ] 12.7 All new linters wired into `npm run postbuild` and CI: `lint:tokens`, `lint:standards`, `lint:bridge`, `lint:taglines`, `lint:meta`, `lint:brand`, `lint:skip-link`, `validate:structured-data`, `validate:indexation`, `verify:font-metrics`.
- [ ] 12.8 ast-grep (`npm run lint:sg:ci`) passes — no new violations of `no-inner-html`, `no-set-html-directive`, `no-hardcoded-secrets`, `no-console-log-sensitive`.

## Phase 13 — Docs & announce

- [ ] 13.1 Update `README.md` with new routes, capability inventory, theme toggle, RSS feed.
- [ ] 13.2 Launch post under `/writing/` covering the redesign + theming + standards registry.
- [ ] 13.3 `openspec archive update-site-marketing-redesign` after deploy verification (use `--yes` for non-interactive).
- [ ] 13.4 File follow-up changes for: author public pages, changelog page, `/writing/tag/[tag]`, i18n, PWA installability.

## Parallelism notes

- Phases 2 + 4 can start in parallel; Phase 5 depends on both.
- Phases 6 and 7 are independent; both consume Phase 4.
- Phase 8 consumes 3 + 5.
- Phases 9, 10, 11 are independent after Phase 3, but share `BaseLayout.astro` — stage edits.

## Rollback

Revert PRs in reverse phase order. Per-phase revert is self-contained: each phase writes to its own capability dir and its own `src/` tree. The cross-cutting files (`BaseLayout.astro`, `theme.css`, `csp.mjs`) are touched by Phases 2/3/9/10/11 — if multiple revert, restore those files to the pre-Phase-2 baseline.
