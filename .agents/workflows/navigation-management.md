# Navigation Management

## Overview

Clean, accessible header navigation system with active link
highlighting, plus per-route ShimPage placeholders for routes that
exist for navigation continuity but don't yet have full content. The
canonical reference for the header nav is
`new-design/extracted/src/pages/index.html:560-567` — see
`src/components/Header.astro` for the live `NAV_LINKS` constant.

## Header Navigation Structure

### Primary Navigation Links (canonical per pt87)

`src/components/Header.astro` declares six links in this exact order
(canonical per `new-design/extracted/src/pages/index.html`):

1. **Platform** — `/platform` — pillar tri-band, bridge story
2. **Bridge** — `/bridge` — VC↔OIDC bridge landing
3. **Use cases** — `/use-cases` — scenario cards
4. **Standards** — `/standards` — registry sourced from
   `src/data/standards.ts`
5. **Roadmap** — `/roadmap` — phased delivery timeline
6. **Blog** — `/writing` — RSS feed at `/writing/feed.xml`
   (the nav label is "Blog" but the route is `/writing` per pt87
   canonical text)

The pre-pt87 4-item list (Platform · Use cases · Standards · Writing)
was based on `BaseLayout.jsx:203-208` (a different canonical
reference); the user-facing canonical is the 6-item index.html nav.

### Right-side container

The header right slot per canonical
`new-design/extracted/src/components/BaseLayout.jsx:220-238`:

- **Tagline pill** — motto / current-status indicator
- **GitHub icon button** — 34×34 rounded-square outbound link
  (`rel="noopener noreferrer"` + `target="_blank"`)
- **Get Started CTA** — primary `/get-started` button

The original header **ThemeToggle** dropdown was removed in pt87 and
the standalone `src/components/ThemeToggle.astro` component was
deleted as orphan in pt166. Theme switching is now exercised via the
dev-only `Tweaks` panel (`src/components/TweaksPanel.tsx`); production
routes ship with whatever theme persisted from localStorage. See
`.agents/workflows/theme-management.md`.

## Active Link Highlighting

The header automatically highlights the active page based on the
current URL path:

```astro
const path = Astro.url.pathname;
const active = (href: string) => path === href || path.startsWith(href + '/');
```

Active links receive the `.active` class with distinct styling using
canonical `--accent` / `--line` / `--fg` tokens (see
`src/components/Header.astro` scoped `<style>` block). The site never
relies on browser-default focus / hover styling for nav links;
`:focus-visible` is set explicitly per the WCAG 2.1 AA contract.

## Skip Link Accessibility

The skip link is hidden until keyboard focus:

- TAB on page load reveals it
- Appears at top-left with focus
- Jumps directly to `#main-content` (the `<main>` id; pre-pt? was
  `#main`)
- Styled with theme variables for consistency

CSS: `.skip-link` (hidden) and `.skip-link:focus` (visible). The
postbuild gate `scripts/lint-skip-link.mjs` walks every `*.html` in
`.build/dist/` and asserts the first focusable element in `<body>` is
a `class="skip-link"` anchor whose `href="#<id>"` target id exists on
the page.

## Shim Pages

Shim pages prevent 404 errors while content is being built. They use
the `src/components/ShimPage.astro` component. `grep -l ShimPage
src/pages/` enumerates the live shim set:

- `/developers` — Developer hub placeholder (links to /docs and /play)
- `/docs` — Documentation portal placeholder
- `/how` — How it works explanation (links to home `#how`)
- `/play` — Interactive playground placeholder
- `/privacy` — Privacy policy placeholder
- `/security` — Security posture placeholder
- `/status` — Uptime / incidents dashboard placeholder

All seven shim routes carry `robots="noindex, nofollow"` and are
filtered out of `sitemap-index.xml` per `astro.config.ts` `sitemap()`
filter (`NOINDEX_ROUTES` allowlist; see pt146 narrative).

### Real Pages (full content, not shims)

- `/` — Marketing home (Hero, TrustChainIsland, latest writing strip,
  affiliations, on-ramp, HomeExplore)
- `/platform` — Mounts `PillarsIsland` directly per `platform.html:848`
- `/vision` — Long-form Vision MDX rendered via `<Content />`
- `/roadmap` — `RoadmapTimeline` from `src/data/roadmap.ts`
- `/faq` — FAQ MDX from `src/data/faq.ts` registry
- `/use-cases`, `/standards` — USMR-Phase-5.x marketing routes
- `/bridge` — Dedicated landing for the VC↔OIDC bridge
- `/get-started` — Design-partner program landing (per pt87 + pt93;
  was a stub linking to /console + /docs pre-USMR Phase 5.5.14)
- `/search` — Algolia DocSearch UI
- `/writing` + `/writing/[slug]` + `/writing/feed.xml` —
  Content-collection-driven blog
- `/404` — Error page

## Adding New Navigation Links

1. **Update `NAV_LINKS` in `src/components/Header.astro`** (the
   `as const` tuple at the top of the frontmatter):

   ```astro
   const NAV_LINKS = [
     { href: '/platform', label: 'Platform' },
     // ...
     { href: '/newpage', label: 'New Page' },
   ] as const;
   ```

   The header template iterates `NAV_LINKS.map(...)` so no markup
   edit is needed. The active-link comparison `Astro.url.pathname ===
href || path.startsWith(href + '/')` handles both flat and nested
   matches automatically.

2. **Create shim or real page**:

   ```astro
   ---
   // src/pages/newpage/index.astro
   import ShimPage from '../../components/ShimPage.astro';
   ---
   <ShimPage
     title="New Page"
     description="Description here"
     ctaHref="/"
     ctaLabel="Back to home"
   />
   ```

3. **If the route should be `noindex`**, add it to `NOINDEX_ROUTES`
   in `astro.config.ts` so the sitemap filter excludes it.

## ShimPage Component API

```typescript
interface Props {
  title: string;
  description?: string;
  ctaHref?: string; // default: '/'
  ctaLabel?: string; // default: 'Back to home'
  altLinks?: { href: string; label: string }[];
}
```

## Styling Customization

Header styles ship as scoped `<style>` in `src/components/Header.astro`
(per the project's "no global header rules in theme.css" discipline).
Token references use the canonical aliases (`--bg`, `--bg-1`,
`--line`, `--line-soft`, `--fg`, `--fg-1/2/3`, `--accent`).

## Responsive Behavior

The pt? mobile-nav contract uses a CSS-only hamburger pattern
(checkbox + `:checked` siblings) for `<720px` viewports — see
`src/components/Header.astro` `[data-nav-toggle]` handler and the
`body.nav-open` body-class pivot per canonical
`new-design/extracted/src/pages/index.html:387-421`. The pt85 commit
removed the dead `toggleMenu()` function from BaseLayout that
targeted IDs (`#menu-btn` / `#menu`) which don't exist in the
markup. The `tests/header.spec.ts` mobile-touch-affordance test
covers the hamburger-pattern contract.

## Testing Checklist

- [ ] Skip link appears on TAB, jumps to `#main-content`
- [ ] Active link highlights correctly on each page
- [ ] All navigation links resolve (no 404s) — `npm run lint:links`
      via Lychee CI
- [ ] Tagline displays correctly
- [ ] Get Started CTA is prominent
- [ ] External GitHub link has `rel="noopener noreferrer"` +
      `target="_blank"`
- [ ] Keyboard navigation works throughout the nav
- [ ] Focus styles visible and consistent (`:focus-visible` outline
      using `var(--accent)` per WCAG 2.1 AA contract)
- [ ] Mobile-nav hamburger opens / closes on tap and via Esc key
