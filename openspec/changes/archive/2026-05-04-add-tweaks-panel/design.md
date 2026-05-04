# Design — add-tweaks-panel

## Why a custom element instead of an Astro component?

Astro components render at build time. The Tweaks panel needs:

- Click handlers to mutate state.
- A keyboard handler bound at the window level.
- Read/write of `localStorage` and the `<html>` element's `data-*` attributes.

That's runtime work. Astro's escape hatch is a `<script>` block, which Vite bundles and ships to the browser. The cleanest way to package "DOM glue + state machine" without React is a custom element. It's a built-in browser API, requires zero dependencies, and naturally encapsulates lifecycle (`connectedCallback`/`disconnectedCallback`).

## Why split `tweaks.ts` and `tweaks-state.ts`?

`tweaks.ts` references `localStorage`, `document`, `customElements`, `HTMLElement`, and `KeyboardEvent`. None of those exist in node:test. If we want unit tests for parse/type-guard logic — which is where bugs hide for state restored from disk — that logic must live in a file that doesn't touch the DOM.

The split is:

- **`tweaks-state.ts`** — pure: types, defaults, type guards, `parse(unknown): Tweaks`, `ACCENT_SWATCH` table. Importable from anywhere.
- **`tweaks.ts`** — DOM/browser side: `load()` (localStorage + parse), `save()`, the custom element class, render markup, click/keyboard wiring. Imports the pure module.

`load()` and `save()` stay in `tweaks.ts` because they touch `localStorage`, which would require a fake-storage adapter to test under node — overkill for two trivial wrappers. The `parse()` function they call IS tested, so the failure modes (corrupted JSON, missing keys, wrong types) are covered.

## Why `import.meta.env.DEV` and not a query-param gate?

A query-param gate (e.g. `?tweaks=1`) keeps the panel runnable in production. That's tempting for QA but creates a permanent CSP/SRI surface and a permanent JS payload. The user's brief was explicit: "never enters the production bundle (and never has to satisfy CSP/SRI)."

`import.meta.env.DEV` is a Vite/Astro build-time constant. When the production build runs, the constant is replaced with the literal `false`, the `{isDev && (...)}` JSX collapses, and the inner `<script>import "../scripts/tweaks.ts";</script>` is never traced. Vite never even reads `tweaks.ts`. Result: zero bytes in `.build/dist/` reference the panel.

Verified: `grep -rl 'artagon-tweaks\|tweaks-panel' .build/dist/` returns empty after `npm run build`.

If a "preview in prod" need surfaces later, the right answer is a separate openspec change that adds a build flag (e.g. `ASTRO_PUBLIC_TWEAKS=1`) — not retrofitting this one.

## Why a forward-compatible localStorage schema?

The schema is `STORAGE_KEY = "artagon.tweaks.v1"`. Two design choices follow from that:

1. **Per-field fallback rather than whole-object validation.** If a future version adds a 6th field, old localStorage payloads from v1 still parse cleanly — the new field gets its default. No migration code needed.
2. **Versioned key.** If a future schema change is incompatible (e.g. accent `cyan` is renamed `teal`), bump to `artagon.tweaks.v2`. Old v1 payloads are silently ignored, users start fresh, no migration needed.

The cost is permanent storage of dead v1 keys for users who upgrade. That's a fraction of the localStorage budget per origin (5-10MB) and not worth the complexity of a migration runtime.

## Why type guards instead of `Object.values(ACCENTS).includes`?

Two reasons:

1. **Type narrowing.** A type guard `(v: unknown): v is Accent` lets the caller use the guarded value as `Accent` without an `as` cast. This is the typed-service-contracts skill's "parse don't validate" principle: at the boundary, transform unknown into a refined type, then trust the type downstream.
2. **`includes` doesn't narrow on readonly arrays.** TypeScript treats `ACCENTS.includes(v)` as `boolean`, not as a type predicate, even when `ACCENTS` is `ReadonlyArray<Accent>`. The cast inside the guard (`(ACCENTS as ReadonlyArray<string>).includes(v)`) is unavoidable but localized.

## Why is the upstream React `setInterval` carousel not implemented?

`new-design/extracted/src/components/Bridge.jsx:8` has a hooks-based carousel. The Tweaks panel does NOT carousel anything; the timer is on a different component. This change scope is the panel only. Bridge's carousel translation is part of USMR Phase 5 (component conversion) and will use `<input type="radio">` + CSS `:checked` patterns per the conversion guidance prompt.

## Why is the iframe `postMessage` integration omitted?

The upstream `BaseLayout.jsx:378-385` listens for `__activate_edit_mode` / `__deactivate_edit_mode` messages from a parent frame (the Stitch design canvas). That coupling is specific to the Stitch tool. This repo doesn't host the panel inside an iframe; the integration is dead code outside Stitch.

If the redesign team needs canvas-driven toggling later, it's a small additive change: add a `window.addEventListener('message', ...)` in `tweaks.ts` `connectedCallback` that calls `this.toggle(true|false)`. Not on the critical path for this change.

## Tradeoff: `data-theme` overlap with the live theme switcher

The live `BaseLayout.astro` already has a `data-theme` switcher that accepts `midnight | twilight | slate` and persists under the key `artagon.theme`. The Tweaks panel writes `dark | light` under a different key (`artagon.tweaks.v1`).

If a designer toggles `theme` in the Tweaks panel, it sets `data-theme="dark"` (or `"light"`), which DOES NOT match any of the three live theme packs. Result: cards render with token defaults from the un-themed `:root {}` block, not from any of the three theme-pack `:root[data-theme="..."]` blocks. The site looks "stuck" in default colors.

This is a known, accepted limitation. Two reasons:

1. The panel is a USMR-conversion tool. Once USMR archives, the live three-pack switcher is replaced by the new-design's `dark`/`light`/`auto` system, and the conflict resolves.
2. Documenting the conflict in this design.md is cheaper than building a bidirectional sync that gets thrown away three weeks later.

If a designer hits the conflict during conversion: the workaround is to hard-refresh and the live theme persistence script (BaseLayout lines 16-37) restores `data-theme="midnight"` on next paint.

## Style choices

- **Trigger position**: fixed bottom-right at 12px inset. Same place where dev tools widgets typically live.
- **Default opacity**: `0.6`. Goes to `1.0` on hover and when panel is open. The trigger is unobtrusive when not in use.
- **Trigger label**: lowercase `⚙ tweaks`. The gear glyph hints at config; the lowercase echoes the upstream's typography register (mono, `letter-spacing: 0.06em`).
- **Active button style**: brand-teal background, dark-navy text. Same color contract as the live `.cta` button. No new tokens needed.
- **Panel width**: 280px. Wide enough for 4-button rows without wrapping; narrow enough not to cover content.
- **Footer microcopy**: "Dev only. Changes persist in localStorage." sets expectations — designers know it's transient and local.
