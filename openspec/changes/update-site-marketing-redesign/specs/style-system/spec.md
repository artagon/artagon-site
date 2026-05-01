## ADDED Requirements

### Requirement: Cascade Layers in theme.css

`public/assets/theme.css` MUST declare cascade layers in this order: `@layer reset, tokens, utilities, components, overrides;`. All token definitions MUST live in the `tokens` layer; all utility classes MUST live in `utilities`; component-scoped Astro `<style>` blocks belong in `components`; the `overrides` layer is reserved for emergency targeted fixes.

#### Scenario: New token lives in tokens layer

- **WHEN** a contributor adds a new `--color-*` token to `public/assets/theme.css`
- **THEN** the declaration appears within `@layer tokens { ... }` and `lint:tokens` passes.

### Requirement: Fluid Type Scale via clamp()

Headline and display type MUST use viewport-based `clamp()` formulas with explicit floor and ceiling values. The h1 scale floor MUST be ≥ 56 px at 360 px viewport; the ceiling MUST be ≤ 108 px at ≥ 1440 px viewport. No heading SHALL reflow more than 3× between adjacent breakpoints.

#### Scenario: h1 stays readable at 360 px

- **WHEN** the home route is rendered at 360 px viewport
- **THEN** the computed `font-size` of the hero `<h1>` is ≥ 56 px and the headline does not overflow horizontally.

### Requirement: Container-Query Layout Primitives

Layout primitives `TwoCol`, `ThreeCol`, `CodePair`, and `PillarGrid` MUST use `@container (inline-size < 640px)` for stack thresholds, with `@supports not (container-type: inline-size) { @media (max-width: 640px) { ... } }` fallbacks for browsers without container-query support.

#### Scenario: TwoCol stacks under fallback

- **WHEN** a browser lacks `container-type: inline-size` support and the viewport is 480 px wide
- **THEN** `TwoCol` renders its children stacked vertically via the `@media` fallback.

### Requirement: Self-hosted WOFF2 Fonts with Metrics Overrides

All custom typefaces MUST be self-hosted under `public/assets/fonts/` as WOFF2 only, with `unicode-range` subsetting (Latin + Latin-Extended at minimum). Each `@font-face` block MUST declare `size-adjust`, `ascent-override`, `descent-override`, and `line-gap-override` derived from the configured fallback-font metrics. `font-display: swap` is required for all faces. The non-display families (Fraunces, Instrument Serif) MUST NOT load on routes that don't use them; the `<link rel="preload">` tag MUST be emitted only for the LCP-critical face.

#### Scenario: Font swap produces no measurable CLS

- **WHEN** the home route loads with a cold font cache
- **THEN** the Cumulative Layout Shift attributable to font swap is < 0.05 (measured by Playwright + LayoutShift API).

#### Scenario: CSP font-src is self-only

- **WHEN** the post-build CSP meta tag is inspected
- **THEN** the `font-src` directive contains only `'self'` (no third-party host).

#### Scenario: LCP-critical face is preloaded by name

- **WHEN** the home route is built
- **THEN** the head contains exactly one `<link rel="preload" as="font" type="font/woff2" crossorigin>`, AND the href matches the `@font-face` `src` URL of the family used by the LCP `<h1>` (Space Grotesk per DESIGN.md), verified by Playwright asserting `getComputedStyle(document.querySelector('h1')).fontFamily` resolves to that family.

### Requirement: Font Payload Budget

Total WOFF2 payload per route MUST NOT exceed 180 KB; per-family WOFF2 payload (sum of all weights/styles loaded) MUST NOT exceed 60 KB. `scripts/measure-font-payload.mjs` (`npm run measure:font-payload`) MUST measure the WOFF2 bytes loaded by each route in `dist/` and fail the build if either ceiling is exceeded.

#### Scenario: Home route under budget

- **WHEN** the measurement script runs against the built home route
- **THEN** the total WOFF2 payload referenced by the route is ≤ 180 KB and no single family exceeds 60 KB.

#### Scenario: Adding a heavy face fails the budget

- **WHEN** a contributor adds a new `@font-face` that pushes a route over 180 KB total
- **THEN** `npm run measure:font-payload` exits non-zero with the offending route, family, and byte counts.

### Requirement: Token Categories

`public/assets/theme.css` MUST define token categories for: motion (`--motion-duration-*`, `--motion-easing-*`), elevation (`--elevation-*`), focus-ring (`--focus-ring-*`), z-index (`--z-*`), spacing (`--space-*`), and radius (`--radius-*`). All component CSS MUST consume these tokens; raw px / em / rem values for these categories outside `theme.css` are forbidden.

#### Scenario: Component uses spacing token

- **WHEN** a contributor authors a new Astro component that needs 16 px inline padding
- **THEN** the component CSS uses `var(--space-3)` (or equivalent token) and `lint:tokens` does not flag the file.

### Requirement: Card Variant Set

The Card component MUST also support `variant="domain"`, `variant="pillar"`, `variant="component"`, and `variant="product"`, each applying the corresponding `.ui-card--<variant>` utility class as defined in `public/assets/theme.css`. Variants MUST be additive to `variant="solid"`; existing solid behavior MUST remain unchanged.

#### Scenario: Card renders pillar styling

- **WHEN** a developer renders `<Card variant="pillar">`
- **THEN** the root element includes the `.ui-card--pillar` class.

#### Scenario: Card renders product styling

- **WHEN** a developer renders `<Card variant="product">`
- **THEN** the root element includes the `.ui-card--product` class.

### Requirement: Lighthouse CI Performance Gate

`lighthouserc.json` MUST collect every marketing route (`/`, `/platform`, `/use-cases`, `/standards`, `/roadmap`, `/writing`) plus a representative `/writing/[slug]` route. Per-URL thresholds MUST be expressed via the official Lighthouse CI `assertMatrix` schema (NOT a flat `assertions` block, which cannot vary thresholds per URL). Each entry in `assertMatrix` MUST declare a `matchingUrlPattern` regex and the assertion set that applies to URLs matching it. Marketing-route entries MUST assert performance at **`error` severity** with `minScore: 0.9`. Core Web Vitals MUST be asserted with thresholds: `largest-contentful-paint` ≤ 2500 ms, `cumulative-layout-shift` ≤ 0.1, `total-blocking-time` ≤ 200 ms, `interaction-to-next-paint` ≤ 200 ms. The `accessibility`, `seo`, and `best-practices` categories MUST also be asserted at `error` with `minScore: 0.95`. Other capabilities (e.g., `site-brand-gallery` for `/brand`) MAY add additional `assertMatrix` entries with relaxed thresholds via separate spec requirements; they MUST NOT lower the marketing-route thresholds defined here.

#### Scenario: Marketing route fails perf threshold

- **WHEN** any marketing route's Lighthouse `performance` score drops below 0.9
- **THEN** Lighthouse CI exits non-zero and the build fails (not just a warning).

#### Scenario: CWV budget exceeded

- **WHEN** any marketing route's `largest-contentful-paint` exceeds 2500 ms
- **THEN** Lighthouse CI exits non-zero with the offending route and metric.

#### Scenario: Every marketing route is collected

- **WHEN** `lighthouserc.json` is parsed
- **THEN** the `collect.url` array contains entries for every marketing route AND at least one `/writing/[slug]` URL.

### Requirement: Merge-Order Prerequisite Gate

`scripts/verify-prerequisites.mjs` (`npm run verify:prerequisites`) MUST fail the build unless `openspec/changes/refactor-styling-architecture/` is archived OR its merge commit is an ancestor of `HEAD`. The script MUST run in `postbuild` and in the PR CI workflow. Archive detection MUST check both `openspec/changes/archive/*-refactor-styling-architecture/` directory presence and (as a fallback) `git merge-base --is-ancestor` against the current HEAD.

#### Scenario: Prerequisite missing fails the build

- **WHEN** `refactor-styling-architecture` is still in flight (not archived) AND its merge commit is not in HEAD's ancestry
- **THEN** `npm run verify:prerequisites` exits non-zero with the offending prerequisite name.

#### Scenario: Prerequisite archived passes

- **WHEN** `refactor-styling-architecture` is archived under `openspec/changes/archive/`
- **THEN** `npm run verify:prerequisites` exits 0 and the build proceeds.

### Requirement: Existing Token Preservation

Every theme token defined in `public/assets/theme.css` BEFORE this change merges (the pre-existing `--brand-teal`, `--bg`, `--surface`, `--ink`, gradient tokens, `--ui-card-*`, etc.) MUST remain resolvable on every route after this change merges. Tokens MAY be aliased to new semantic names but the original token names MUST continue to resolve. Renaming or removing a pre-existing token requires a separate OpenSpec change with explicit rename mapping.

#### Scenario: Pre-existing token still resolves

- **WHEN** an out-of-scope route (`/faq`, `/vision`, `/console`) is rendered after this change merges
- **THEN** every `var(--*)` reference defined before this change still resolves to a non-empty value; computed styles match pre-merge baselines.

#### Scenario: Removing a pre-existing token fails the build

- **WHEN** a contributor deletes `--brand-teal` from `theme.css` without authoring a separate rename change
- **THEN** `npm run check:design-drift` and any in-scope route that references the token fail the build.

### Requirement: Midnight Theme

A `midnight` theme MUST be defined under `[data-theme="midnight"]` in `public/assets/theme.css`. Both `twilight` and `midnight` MUST pass WCAG 2.2 AA contrast for body text and UI elements; this is verified by `@axe-core/playwright`.

#### Scenario: Midnight passes axe

- **WHEN** the `/platform` route is loaded with `<html data-theme="midnight">`
- **THEN** `@axe-core/playwright` reports zero serious or critical contrast violations.

#### Scenario: Theme persists across navigation

- **WHEN** a user toggles to `midnight` and navigates to `/standards`
- **THEN** the destination route renders with `data-theme="midnight"` applied before first paint (no flash of `twilight`).

## MODIFIED Requirements

### Requirement: Theme-Aware Fallback Tokens

Theme token fallbacks for `color-mix` usage MUST be defined per theme or derived from theme variables so theme changes preserve intended hues when fallbacks are used. This applies to both `twilight` and `midnight` themes.

#### Scenario: Theme uses fallback tokens

- **WHEN** the site is rendered in a browser without `color-mix` support and `data-theme="twilight"` is active
- **THEN** gradient and border fallbacks use twilight theme colors rather than midnight defaults.

#### Scenario: Midnight uses midnight fallbacks

- **WHEN** the site is rendered in a browser without `color-mix` support and `data-theme="midnight"` is active
- **THEN** gradient and border fallbacks use midnight theme colors rather than twilight defaults.

### Requirement: UI Component Attribute Compatibility

Card, SectionHeader, and FeatureList components MUST accept both `class` and `className`, merge them, and forward remaining HTML attributes to the root element. New primitives in scope here (`StandardChip`, `StandardsRow`, `BridgeFlow`, `TwoCol`, `ThreeCol`, `CodePair`, `PillarGrid`, `TrustChain`, `TrustChainTooltip`) MUST follow the same pattern.

#### Scenario: SectionHeader forwards standard attributes

- **WHEN** a developer renders `<SectionHeader id="architectural-principles" data-testid="section">`
- **THEN** the root element includes the `id` and `data-testid` attributes alongside the component classes.

#### Scenario: StandardChip forwards id

- **WHEN** a developer renders `<StandardChip id="oid4vc" data-testid="chip">`
- **THEN** the root element includes the `id` and `data-testid` attributes alongside the component classes.

### Requirement: Solid Card Variant

The Card component MUST support `variant="solid"`, applying the `.ui-card--solid` utility to match the solid card styling.

#### Scenario: Card renders solid styling

- **WHEN** a developer renders `<Card variant="solid">`
- **THEN** the root element includes the `.ui-card--solid` class.
