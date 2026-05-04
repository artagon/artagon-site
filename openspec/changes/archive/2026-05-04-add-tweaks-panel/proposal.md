## Why

The new-design source at `new-design/extracted/` ships a runtime "Tweaks" panel (in `src/layouts/BaseLayout.jsx`) that lets designers sweep through accent colors, density levels, theme variants, hero fonts, and a background-grid toggle without rebuilding. The upstream implementation is React-with-hooks. The panel is genuinely useful during conversion — designers and review agents need to validate the design across all permutations — but it should never reach production users.

**Adoption posture (revised mid-flight):** This change initially shipped a vanilla custom-element implementation to defer the React install. That decision was reversed once the redesign authorization for React islands landed (commit `290f111`). The Tweaks panel is now the project's **first React island** — faithful to upstream `BaseLayout.jsx:312-359` — and serves as the working reference for the redesign's interactive surfaces (`/play`, `/console`, `/search`, hero animation, Bridge carousel). The dev-only gate is preserved: the panel still never renders for production users.

## What Changes

- **Install React stack**: `@astrojs/react`, `react`, `react-dom` (deps), `@types/react`, `@types/react-dom` (devDeps). React 19 series matching `@astrojs/react@^4` peer range.
- **Wire `react()` into `astro.config.ts`** integrations array.
- **Add `src/components/TweaksPanel.tsx`** — React island faithful to upstream `BaseLayout.jsx:312-359`. Uses `useState` + `useEffect` for state, persistence, and DOM projection. Imports types and constants from `tweaks-state.ts` (unchanged).
- **Add `src/components/Tweaks.astro`** — Astro host gated on `import.meta.env.DEV`. Mounts the React island as `<TweaksPanel client:idle />`. The conditional means no production HTML references the island, so browsers never fetch its compiled chunk. (Vite emits a 4KB orphan to `_astro/TweaksPanel.[hash].js`; that's accepted overhead, no dynamic-import workaround.)
- **Add `src/scripts/tweaks-state.ts`** — pure state module (parse, type guards, defaults, accent swatch table). Importable from both the React island and node:test.
- **Add `tests/tweaks-state.test.mts`** + `tests/tweaks-parse.test.mjs` — node:test coverage for parse boundary cases, type guards, defaults round-trip, accent swatch completeness. Runs via `node --test` (no new test runner).
- **Wire into `src/layouts/BaseLayout.astro`** — add `import Tweaks from '../components/Tweaks.astro'` and place `<Tweaks />` inside `<body>`. The component is self-gating.
- **Persistence contract** — state lives in `localStorage["artagon.tweaks.v1"]` as JSON. Schema is forward-compatible: unknown keys dropped, invalid values fall back to defaults per-field. Never throws on malformed input.
- **DOM contract** — projects state onto `<html>` via `data-accent`, `data-density`, `data-theme`, `data-hero-font`; toggles `.no-grid` on `<body>` when `showGrid` is `false`. CSS in `public/assets/theme.css` (and post-USMR token files) consumes these attributes via `:root[data-accent="..."]` etc.
- **Production posture verification**: build then `rg -l 'tweaks-host\|tweaks-trigger\|TweaksPanel' .build/dist/*.html` returns empty. Only the orphaned `_astro/TweaksPanel.*.js` chunk lives in dist, unreferenced.

## Scope Boundaries

**In Scope:**

- The Astro component, TS modules, and node:test test file listed above.
- `BaseLayout.astro` mount point.
- Documentation in this change directory.

**Out of Scope:**

- CSS overrides for the new `data-accent`, `data-density`, `data-hero-font` attributes — those land with the new-design conversion (USMR). Until that conversion lands, toggling `density` or `accent` has no visible effect; the panel is harmless.
- Any change to the existing `data-theme` switcher (`midnight`/`twilight`/`slate`). The Tweaks panel writes `dark`/`light` via `data-theme`, which conflicts with the live theme system. **This is a known limitation** — the panel is a USMR conversion-period tool, and the live `data-theme` triplet (`midnight`/`twilight`/`slate`) will be the source of truth until USMR retires it.
- ~~React/`@astrojs/react` integration~~ — **REVISED**: this change now installs `@astrojs/react` for the project. The Tweaks panel is the proof-of-concept React island. Downstream changes (USMR's `/play`, `/console`, `/search`, hero animation, Bridge carousel) consume the same React runtime — no further install needed. The redesign change's React-install task (`update-site-marketing-redesign`) is now satisfied by this change.
- iframe `postMessage` integration with the upstream "edit mode" — out of scope; the upstream code at `new-design/extracted/src/layouts/BaseLayout.jsx:378-385` is bound to a Stitch design canvas that this repo does not host.

## Rollback

If the panel surfaces in a production build (regression of the dev-only gate), the rollback is:

1. Remove `<Tweaks />` from `BaseLayout.astro`.
2. The component file can stay; without the BaseLayout import it ships zero bytes.
3. Verify with `grep -r 'artagon-tweaks\|tweaks-panel' .build/dist/` returning empty.
