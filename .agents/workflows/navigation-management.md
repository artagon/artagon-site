# Navigation Management

## Overview

Clean, accessible navigation system with active link highlighting and shim pages to prevent 404s during development.

## Header Navigation Structure

### Primary Navigation Links

- **Platform** - `/platform` - Overview of the Artagon Identity Platform
- **How it works** - `/how` - Technical architecture and flow explanation
- **Developers** - `/developers` - Developer hub with SDKs, APIs, conformance harness
- **Search** - `/search` - Site search functionality
- **Docs** - `/docs` - Documentation portal
- **GitHub** - External link to GitHub organization
- **Get Started** (CTA) - `/get-started` - Quickstart guide and console access

### Additional Components

- **Tagline** - Motto pill showing current status
- **ThemeToggle** - Theme switcher dropdown

## Active Link Highlighting

The header automatically highlights the active page based on the current URL path:

```astro
const path = Astro.url.pathname;
const active = (href: string) => path === href || path.startsWith(href + '/');
```

Active links receive the `.active` class with distinct styling:

- Border color from theme border variable
- Slightly lighter background
- Full opacity

## Skip Link Accessibility

The skip link is hidden until keyboard focus:

- Press TAB on page load to reveal
- Appears at top-left with focus
- Jumps directly to main content (#main)
- Styled with theme variables for consistency

CSS: `.skip-link` (hidden) and `.skip-link:focus` (visible)

## Shim Pages

Shim pages prevent 404 errors while content is being built. They use the `ShimPage` component.

### Available Shim Routes

- `/platform` - Platform overview (links to home #platform)
- `/how` - How it works explanation (links to home #how)
- `/developers` - Developer hub (links to /docs and /play)
- `/privacy` - Privacy policy placeholder
- `/security` - Security posture placeholder
- `/status` - Uptime/incidents dashboard placeholder
- `/play` - Interactive playground placeholder

### Real Pages

- `/get-started` - Full quickstart page with console/docs links
- `/search` - Search functionality (implement separately)
- `/docs` - Documentation portal (implement separately)

## Adding New Navigation Links

1. **Update Header.astro**:

```astro
<li><a href="/newpage" class={active('/newpage') ? 'active' : ''}>New Page</a></li>
```

2. **Create shim or real page**:

```astro
// src/pages/newpage/index.astro
import ShimPage from '../../components/ShimPage.astro';
<ShimPage
  title="New Page"
  description="Description here"
  ctaHref="/"
  ctaLabel="Back to home"
/>
```

## ShimPage Component API

```typescript
interface Props {
  title: string; // Page heading
  description?: string; // Description text
  ctaHref?: string; // Primary button link (default: '/')
  ctaLabel?: string; // Primary button text (default: 'Back to home')
  altLinks?: { href: string; label: string }[]; // Additional links
}
```

## Styling Customization

Header styles in `public/assets/theme.css`:

- `.skip-link` - Hidden skip link
- `.skip-link:focus` - Visible focused skip link
- `header .nav` - Main nav container
- `header .links` - Navigation links list
- `header .links a` - Individual link styles
- `header .links a.active` - Active link highlight
- `header .right` - Right side container (tagline, toggle, CTA)

All styles use CSS variables for theme compatibility.

## Responsive Behavior

Current implementation is desktop-focused. For mobile navigation:

- Consider collapsible menu for small screens
- Preserve active link highlighting
- Maintain skip link accessibility
- Keep theme toggle accessible

## Testing Checklist

- [ ] Skip link appears on TAB, jumps to #main
- [ ] Active link highlights correctly on each page
- [ ] All navigation links resolve (no 404s)
- [ ] Theme toggle works on all pages
- [ ] Tagline displays correctly
- [ ] Get Started CTA is prominent
- [ ] External GitHub link has rel="noopener"
- [ ] Keyboard navigation works throughout
- [ ] Focus styles visible and consistent
