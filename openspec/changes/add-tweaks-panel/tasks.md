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
- [ ] 5.4 Manual dev verification: `npm run dev`, load any route, click ⚙ trigger, toggle each control, refresh, verify state persists.
- [ ] 5.5 Manual dev verification: `data-accent`/`data-density`/`data-theme`/`data-hero-font` attributes on `<html>` reflect panel state.
- [ ] 5.6 Manual dev verification: `.no-grid` class on `<body>` toggles when grid switch flipped.

## 6. Documentation

- [x] 6.1 Author `proposal.md`, `design.md`, `tasks.md` (this file).
- [x] 6.2 Author spec delta at `specs/style-system/spec.md` adding the dev-only-tooling requirement.
- [ ] 6.3 Note in `docs/guides/styling-guide.md` that the Tweaks panel exists as a dev tool (deferred to follow-up; not blocking archive).

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
