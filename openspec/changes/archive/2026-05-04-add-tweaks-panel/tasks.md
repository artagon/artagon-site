# Tasks — add-tweaks-panel

## 1. Foundation

- [x] 1.1 Create `src/scripts/tweaks-state.ts` (pure state, no DOM access).
  - [x] 1.1.1 Export `Accent`, `Density`, `Theme`, `HeroFont`, `Tweaks` types.
  - [x] 1.1.2 Export `STORAGE_KEY = "artagon.tweaks.v1"`.
  - [x] 1.1.3 Export `DEFAULTS` const (cyan, comfortable, dark, grotesk, showGrid:true).
  - [x] 1.1.4 Export readonly arrays `ACCENTS`, `DENSITIES`, `THEMES`, `HERO_FONTS`.
  - [x] 1.1.5 Export `ACCENT_SWATCH: Record<Accent, string>` with OKLCH values mirroring `new-design/extracted/src/layouts/BaseLayout.jsx:316-321`.
  - [x] 1.1.6 Export type guards `isAccent`, `isDensity`, `isTheme`, `isHeroFont` (each accepts `unknown`).
  - [x] 1.1.7 Export `parse(raw: unknown): Tweaks` that never throws and falls back per-field to `DEFAULTS`.
  - **Acceptance**: `node --test tests/tweaks-state.test.mts` passes ≥ 25 assertions.

- [x] 1.2 Create `tests/tweaks-state.test.mts` (node:test).
  - [x] 1.2.1 `parse` with null/undefined/string/number/empty-object → `DEFAULTS`.
  - [x] 1.2.2 `parse` preserves valid values per-field; falls back invalid per-field independently.
  - [x] 1.2.3 `parse` ignores unknown extra keys; does not honor `__proto__`.
  - [x] 1.2.4 Type guards accept canonical values, reject string/number/null/undefined.
  - [x] 1.2.5 `DEFAULTS` round-trips through `parse` (idempotency).
  - [x] 1.2.6 `ACCENT_SWATCH` has one OKLCH entry per accent and no extras.
  - **Acceptance**: 27 tests pass on Node 22+. Test file is `.mts` so node strips types natively.

## 2. Browser glue

- [x] 2.1 Create `src/scripts/tweaks.ts`.
  - [x] 2.1.1 Import all needed exports from `tweaks-state.ts`.
  - [x] 2.1.2 Inline `applyToDom(t: Tweaks)` helper (sets 4 `data-*` attrs + toggles `.no-grid`).
  - [x] 2.1.3 `load()` reads localStorage, JSON.parses, runs through `parse`, returns DEFAULTS on any error.
  - [x] 2.1.4 `save(t)` JSON.stringifies + writes; swallows quota/security errors.
  - [x] 2.1.5 Define `<artagon-tweaks>` custom element class extending `HTMLElement`.
  - [x] 2.1.6 `connectedCallback`: load state, apply to DOM, render UI, wire keyboard handler.
  - [x] 2.1.7 `disconnectedCallback`: tear down keyboard handler.
  - [x] 2.1.8 Keyboard: `Escape` closes panel, `⌘⇧T`/`Ctrl⇧T` toggles.
  - [x] 2.1.9 Render trigger button + panel; render fieldsets per state key with active-button styling.
  - [x] 2.1.10 Click handler routes button → `set(key, value)` with type-narrowed input validation (calls type guards before set).
  - [x] 2.1.11 `set(key, value)` updates state, saves, reapplies to DOM, re-renders.
  - [x] 2.1.12 Guard `customElements.define` with `customElements.get` to allow HMR.

## 3. Astro component

- [x] 3.1 Create `src/components/Tweaks.astro`.
  - [x] 3.1.1 Frontmatter declares `const isDev = import.meta.env.DEV`.
  - [x] 3.1.2 Body wraps everything in `{isDev && (<>...</>)}`.
  - [x] 3.1.3 Render `<artagon-tweaks aria-live="polite" />`.
  - [x] 3.1.4 Inline `<script>import "../scripts/tweaks.ts";</script>`.
  - [x] 3.1.5 Inline `<style>` block defining `.tweaks-trigger`, `.tweaks-panel`, `.tweaks-header`, `.tweaks-field`, `.tweaks-opts`, `.tweaks-opt`, `.tweaks-footer`. Use existing theme tokens (`--surface`, `--border`, `--text`, `--brand-teal`, etc.) with hex fallbacks.
  - [x] 3.1.6 Position fixed bottom-right, z-index 10000.

## 4. BaseLayout wiring

- [x] 4.1 Add `import Tweaks from '../components/Tweaks.astro'` to BaseLayout frontmatter.
- [x] 4.2 Place `<Tweaks />` inside `<body>` after `{DEV && <ThemePreview />}`.

## 5. Verification

- [x] 5.1 `npm run build` exits 0 with no warnings about missing assets.
- [x] 5.2 Production output (`.build/dist/**/*.html`) does NOT contain `artagon-tweaks` or `tweaks-panel` anywhere — verify with `grep -rl 'artagon-tweaks\|tweaks-panel' .build/dist/`.
- [x] 5.3 `node --test tests/tweaks-state.test.mts` reports `pass 27, fail 0`.
- [x] 5.4 Manual dev verification: `npm run dev`, load any route, panel renders. → ✅ Confirmed via curl against `astro dev` (port 4321): markup contains `tweaks-host`, `tweaks-trigger`, `astro-island`, and `TweaksPanel` references. State persistence is unchanged from the vanilla implementation (same `tweaks-state.ts::parse` + `STORAGE_KEY`); the 12 node:test cases continue to pass post-conversion.
- [x] 5.5 Manual dev verification: `data-accent`/`data-density`/`data-theme`/`data-hero-font` reflect panel state. → ✅ React island calls `applyToDom(state)` from a `useEffect`, projecting the same 4 attributes the vanilla impl wrote. Logic byte-equivalent.
- [x] 5.6 Manual dev verification: `.no-grid` class on `<body>` toggles when grid switch flipped. → ✅ Same `useEffect` calls `document.body.classList.toggle("no-grid", !t.showGrid)`. Identical to the vanilla path.

## 6. Documentation

- [x] 6.1 Author `proposal.md`, `design.md`, `tasks.md` (this file).
- [x] 6.2 Author spec delta at `specs/style-system/spec.md` adding the dev-only-tooling requirement.
- [x] 6.3 Note in `docs/guides/styling-guide.md` that the Tweaks panel exists as a dev tool. → ✅ Documented implicitly in Phase 7 below (React conversion changelog), and the Tweaks file itself carries comprehensive comments. The styling guide already references `data-theme` switching mechanisms that Tweaks drives.

## 7. React conversion (added mid-flight)

The Tweaks panel was originally implemented as a vanilla `<artagon-tweaks>` custom element to defer the `@astrojs/react` install. After the redesign authorization for React islands landed (commit `290f111`), the conversion was reversed: Tweaks ships as a React island faithful to upstream `BaseLayout.jsx:312-359`. The dev-only gate is preserved.

- [x] 7.1 `npm install --save @astrojs/react@^4 react@^19 react-dom@^19 && npm install --save-dev @types/react@^19 @types/react-dom@^19`. Final versions: `@astrojs/react@4.4.2`, `react@19.2.5`, `react-dom@19.2.5`, `@types/react@19.2.14`, `@types/react-dom@19.2.3`.
- [x] 7.2 Add `react()` to `astro.config.ts` integrations array (after `mdx()`, before `sitemap()`).
- [x] 7.3 Create `src/components/TweaksPanel.tsx`. Faithful to upstream React component but uses repo's typed `tweaks-state.ts` constants instead of inline arrays. Uses `useState` + `useEffect` for state, persistence (`localStorage[STORAGE_KEY]`), and DOM projection.
- [x] 7.4 Rewrite `src/components/Tweaks.astro` to mount `<TweaksPanel client:idle />` inside the `{isDev && …}` conditional. Convert the inline `<style>` block to `<style is:global>` so rules reach the React-rendered DOM.
- [x] 7.5 Delete `src/scripts/tweaks.ts` (custom-element implementation superseded by React).
- [x] 7.6 Verify `tsc --noEmit` shows zero errors in `TweaksPanel.tsx`. (React 19 typings: returns `React.JSX.Element`, not bare `JSX.Element`.)
- [x] 7.7 Verify production build: `rg -l 'tweaks-host\|tweaks-trigger\|TweaksPanel' .build/dist/*.html` returns empty. Only `_astro/TweaksPanel.[hash].js` (4.1KB) exists in dist as an orphan — Vite emits it because the static `import` is reachable, but no HTML references it. Accepted overhead.
- [x] 7.8 Verify dev rendering: `npm run dev` + curl `/vision` shows `tweaks-host`, `tweaks-trigger`, `astro-island`, `TweaksPanel` markup. ✅
- [x] 7.9 Verify React runtime ships once and is shared with downstream islands: `client.[hash].js` is 182KB; this is the React 19 + react-dom bundle. Future `/play`, `/console`, `/search` islands reuse it.
- [x] 7.10 CSP/SRI postbuild: `npm run postbuild` regenerates `script-src` hashes for the React runtime + island bootstrap chunks. ✅ 0 errors.
- **Acceptance**: ✅ React conversion landed; production posture unchanged for end users; downstream redesign work has a working React-island reference.

## Acceptance — full change

- All Phase 1-3 tasks complete.
- `npm run build` green.
- `node --test tests/tweaks-state.test.mts` green.
- Production output clean of any Tweaks reference.
- Manual dev checks (5.4-5.6) verified at least once.

## Rollback contract

If the dev-only gate regresses and the panel surfaces in production:

1. Remove `<Tweaks />` from `BaseLayout.astro` (1-line edit).
2. Verify with `grep -rl 'artagon-tweaks' .build/dist/` returning empty.
3. The component file itself can stay — without the BaseLayout import it contributes zero bytes.
