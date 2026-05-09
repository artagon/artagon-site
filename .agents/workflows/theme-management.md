# Theme Management

## System Overview

Two-theme system with runtime toggle, localStorage persistence, and URL preview.
Pre-pt167 there was a third theme `slate` (Deep Slate Blue) — it was retired
when its `:root[data-theme="slate"]` block was removed from `theme.css` and
the `BaseLayout.astro` allow-list narrowed to `['twilight', 'midnight']`.

## Available Themes

- `twilight` (default per `BaseLayout.astro` `__setTheme` allow-list and
  the static `<html data-theme="twilight">` attribute) — Twilight Indigo
- `midnight` — Midnight Teal alternate

Out-of-list `data-theme` values collapse to `twilight` per the pre-paint
script's allow-list check.

## Theme Architecture

- **CSS variables**: All themes use CSS variables defined in
  `public/assets/theme.css` under `:root[data-theme="twilight"]` and
  `:root[data-theme="midnight"]` blocks.
- **Data attribute**: `<html data-theme="twilight">` controls active theme.
- **Boot script**: Inline `is:inline` script in `BaseLayout.astro` applies
  the persisted/URL theme before paint to avoid flash.
- **Runtime toggle**: pt87 removed the header theme toggle and pt166
  deleted the standalone `ThemeToggle.astro` component as orphan. The
  dev-only `Tweaks` panel (`src/components/TweaksPanel.tsx`) is the
  canonical theme-switcher surface today; production routes ship with
  whatever theme persisted from localStorage.
- **Helper function**: `window.__setTheme(themeId)` updates `data-theme`,
  persists the choice, and syncs `aria-pressed` on every
  `[data-theme-toggle]` button (defense-in-depth for any future component
  or external embed that opts into the contract — see
  `BaseLayout.astro:116-127`).

## Key Files

- `public/assets/theme.css`: Theme variable definitions and
  token-driven styles.
- `src/layouts/BaseLayout.astro`: Theme boot script, `meta theme-color`,
  `__setTheme` helper, allow-list `['twilight', 'midnight']`.
- `src/components/ThemePreviewPanel.astro`: Dev-only fixed
  bottom-right quick theme switcher (rendered behind `import.meta.env.DEV`
  in `BaseLayout.astro`); enumerates `['twilight', 'midnight']`.
- `src/components/TweaksPanel.tsx`: Dev-only React-island Tweaks panel
  (canonical theme switcher today, plus accent / density / hero-font /
  writing-widget controls).

## Usage

### Adding a New Theme

If a third theme is ever re-added (the slate-retirement archaeology
applies), the steps are:

1. Add theme pack to `theme.css` using canonical aliases
   (per `public/assets/theme.css` and AGENTS.md §"Token source"):

   ```css
   :root[data-theme="newtheme"] {
     --bg: oklch(...);
     --bg-1: oklch(...);
     --bg-2: oklch(...);
     --line: oklch(...);
     --line-soft: oklch(...);
     --fg: oklch(...);
     --fg-1: oklch(...);
     --fg-2: oklch(...);
     --fg-3: oklch(...);
     --accent: oklch(...);
     --accent-dim: oklch(...);
     --accent-ink: oklch(...);
     --bad: oklch(...);
     --ok: oklch(...);
     --warn: oklch(...);
   }
   ```

   The retired 5.1h aliases (`text` / `muted` / `border` / `bg-alt`)
   were pruned in pt86 / pt169 / pt170 — do NOT re-introduce them.

2. Add to the THEMES enumeration in `src/components/ThemePreviewPanel
.astro` AND extend the `BaseLayout.astro` `ALLOWED` allow-list AND
   update `tests/styling-snapshots.spec.ts` `THEMES` array. The pt175
   `lint-styling-snapshots-themes-sync.test.mts` gate enforces these
   stay in sync — run `npm run test:vitest` after the edit.

### URL Preview

- Temporary: `/?theme=twilight` (not persisted)
- Persistent: `/?theme=midnight&persist=1` (saves to localStorage)

Out-of-list values collapse to `twilight` per the allow-list check; the
URL `?theme=slate` would silently fall through to `twilight`.

### Switching Programmatically

```javascript
window.__setTheme("midnight"); // Updates UI, persists, syncs aria-pressed
```

The helper validates against the allow-list before applying; any out-of-
list value collapses to `twilight`. All mutations go through
`setAttribute` only — no `innerHTML` / `outerHTML` / string-concatenated
attribute construction (per the project's CSP discipline).

## CSP/SRI Compatibility

- Inline scripts use `is:inline` attribute so Astro emits them inline
  rather than bundling.
- Scripts are auto-hashed at build by `scripts/csp.mjs`; the orphan-hash
  detection in `csp.mjs` fails the build if any inline script SHA-256 is
  missing from the emitted `script-src` directive.
- No external script imports in inline blocks; CSP `script-src` is
  `'self'` + per-script SHA-256 hashes only.

## Accessibility

- Theme controls (whichever surface ships them) have proper label,
  focus-visible ring (2 px `var(--accent)` outline + 2 px offset per
  the WCAG 2.1 AA contract in `enhance-a11y-coverage`), and
  `aria-pressed` reflecting the active theme.
- Focus rings use `var(--accent)` — `:focus-visible` is set explicitly
  on every interactive element; browser defaults are not relied on.
- All interactive elements are keyboard-accessible.
