# Theme Management

## System Overview
Multi-theme system with runtime toggle, localStorage persistence, and URL preview.

## Available Themes
- `midnight` (default): Midnight Teal - current default theme
- `twilight`: Twilight Indigo - dark blue with indigo accents
- `slate`: Deep Slate Blue - deep blue with slate tones

## Theme Architecture
- **CSS Variables**: All themes use CSS variables defined in `public/assets/theme.css`
- **Data Attribute**: `<html data-theme="midnight">` controls active theme
- **Boot Script**: Early inline script in `BaseLayout.astro` applies persisted/URL theme before render
- **Runtime Toggle**: `ThemeToggle.astro` component provides UI switcher
- **Helper Function**: `window.__setTheme(themeId)` updates theme and persists choice

## Key Files
- `public/assets/theme.css`: Theme variable definitions and token-driven styles
- `src/layouts/BaseLayout.astro`: Theme boot script, meta theme-color, __setTheme helper
- `src/components/ThemeToggle.astro`: Header theme switcher dropdown
- `src/components/ThemePreviewPanel.astro`: Dev-only quick theme switcher (fixed bottom-right)

## Usage

### Adding a New Theme
1. Add theme pack to `theme.css`:
```css
:root[data-theme="newtheme"]{
  --bg:#HEXCOLOR;
  --bg-alt:#HEXCOLOR;
  --surface:#HEXCOLOR;
  --border:#HEXCOLOR;
  --text:#HEXCOLOR;
  --muted:#HEXCOLOR;
  --brand-teal:#HEXCOLOR;
  --brand-violet:#HEXCOLOR;
  --brand-sky:#HEXCOLOR;
  --ring:rgba(...);
}
```
2. Add to THEMES array in `ThemeToggle.astro` and `ThemePreviewPanel.astro`

### URL Preview
- Temporary: `/?theme=twilight` (not persisted)
- Persistent: `/?theme=slate&persist=1` (saves to localStorage)

### Switching Programmatically
```javascript
window.__setTheme('twilight'); // Updates UI, persists to localStorage, syncs theme-color
```

## CSP/SRI Compatibility
- Inline scripts use `is:inline` attribute for Astro
- Scripts are auto-hashed at build by `scripts/csp.mjs`
- No external script imports in inline blocks

## Accessibility
- ThemeToggle has proper label and focus styles
- Focus rings use theme `--ring` variable
- All interactive elements keyboard-accessible
