## Why

The new-design source at `new-design/extracted/` ships a runtime "Tweaks" panel (in `src/layouts/BaseLayout.jsx`) that lets designers sweep through accent colors, density levels, theme variants, hero fonts, and a background-grid toggle without rebuilding. The upstream implementation is React-with-hooks and would require adding `@astrojs/react`, three new npm dependencies, and CSP/SRI exemptions to ship.

The panel is genuinely useful during conversion — designers and review agents need to validate the design across all permutations — but it should never reach production users. We need a lighter implementation that gives designers the same controls in dev, contributes zero bytes to the production bundle, and adds zero new dependencies.

## What Changes

- **Add `src/components/Tweaks.astro`** — Astro component gated on `import.meta.env.DEV`. The conditional block (and its nested `<script>` `import "../scripts/tweaks.ts"`) is statically eliminated by the Astro/Vite build when `DEV === false`, so neither the custom-element registration nor the panel's CSS reach the production bundle.
- **Add `src/scripts/tweaks.ts`** — DOM/custom-element glue. Defines an `<artagon-tweaks>` web component that renders the trigger + panel UI and wires localStorage persistence.
- **Add `src/scripts/tweaks-state.ts`** — pure state module (parse, type guards, defaults, accent swatch table). Importable from both browser glue and node:test.
- **Add `tests/tweaks-state.test.mts`** — node:test coverage for parse boundary cases, type guards, defaults round-trip, and accent swatch completeness. Runs via `node --test` (no new test runner).
- **Wire into `src/layouts/BaseLayout.astro`** — add `import Tweaks from '../components/Tweaks.astro'` and place `<Tweaks />` inside `<body>` after the existing `{DEV && <ThemePreview />}` line. The component is self-gating, so it can be unconditionally rendered.
- **Persistence contract** — state lives in `localStorage["artagon.tweaks.v1"]` as JSON. Schema is forward-compatible: unknown keys are dropped, invalid values fall back to defaults per-field. Never throws on malformed input.
- **DOM contract** — projects state onto `<html>` via `data-accent`, `data-density`, `data-theme`, `data-hero-font`; toggles `.no-grid` on `<body>` when `showGrid` is `false`. CSS in `public/assets/theme.css` (and per-page styles) consumes these attributes via `:root[data-accent="..."]` etc. — same contract the upstream design's `tokens.css` already keys off.

## Scope Boundaries

**In Scope:**

- The Astro component, TS modules, and node:test test file listed above.
- `BaseLayout.astro` mount point.
- Documentation in this change directory.

**Out of Scope:**

- CSS overrides for the new `data-accent`, `data-density`, `data-hero-font` attributes — those land with the new-design conversion (USMR). Until that conversion lands, toggling `density` or `accent` has no visible effect; the panel is harmless.
- Any change to the existing `data-theme` switcher (`midnight`/`twilight`/`slate`). The Tweaks panel writes `dark`/`light` via `data-theme`, which conflicts with the live theme system. **This is a known limitation** — the panel is a USMR conversion-period tool, and the live `data-theme` triplet (`midnight`/`twilight`/`slate`) will be the source of truth until USMR retires it.
- React/`@astrojs/react` integration. Not used by THIS change (Tweaks panel ships as vanilla TS for the dev-only/zero-dep posture). Future interactive surfaces (`/play`, `/console`, `/search`, hero animation, Bridge carousel) will install `@astrojs/react` as part of USMR or a dedicated change. The Tweaks panel does not block that adoption.
- iframe `postMessage` integration with the upstream "edit mode" — out of scope; the upstream code at `new-design/extracted/src/layouts/BaseLayout.jsx:378-385` is bound to a Stitch design canvas that this repo does not host.

## Rollback

If the panel surfaces in a production build (regression of the dev-only gate), the rollback is:

1. Remove `<Tweaks />` from `BaseLayout.astro`.
2. The component file can stay; without the BaseLayout import it ships zero bytes.
3. Verify with `grep -r 'artagon-tweaks\|tweaks-panel' .build/dist/` returning empty.
