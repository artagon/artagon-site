## ADDED Requirements

### Requirement: Primary Navigation

`Nav.astro` SHALL render a sticky 64-px backdrop-blurred bar with the wordmark on the left, four text links (Platform, Use cases, Standards, Writing) in sentence case, and a right cluster containing a GitHub icon-button. The active route MUST be marked with `aria-current="page"`. The nav MUST NOT add a sixth top-level text link without removing one.

#### Scenario: Active route is marked

- **WHEN** the user is on `/platform`
- **THEN** the Platform nav item carries `aria-current="page"` and renders the active-state underline.

#### Scenario: Sticky over scroll

- **WHEN** the user scrolls 600 px down the home route
- **THEN** the nav remains visually pinned at the top with backdrop-blur applied.

### Requirement: Skip Link is First Focusable Element with Focus Move

Every built page MUST begin with a visible-on-focus skip link as its first tabbable element, targeting `<main id="main-content" tabindex="-1">`. Activating the skip link MUST move focus into `<main>` so the next Tab keystroke lands inside the main landmark, not on a duplicate of the skip link or a nav element. This satisfies WCAG 2.4.1 Bypass Blocks across Safari, Firefox, and Chromium browsers (Safari/Firefox do not move focus on hash-only navigation by default).

#### Scenario: Tab from page load lands on skip link

- **WHEN** the user presses Tab once after the page loads
- **THEN** focus is on the skip link and a visible focus ring is shown.

#### Scenario: Activation moves focus into main

- **WHEN** the user activates the skip link (Enter on keyboard or click)
- **THEN** `document.activeElement === document.querySelector('#main-content')` AND the next Tab keystroke focuses the first interactive element inside `<main>`, not a nav element.

#### Scenario: Lint enforces presence and focus move

- **WHEN** any built HTML in `dist/` lacks a skip-link element as the first focusable child of `<body>` OR the skip link does not move focus to `<main>` on activation
- **THEN** `scripts/lint-skip-link.mjs` (or its Playwright equivalent) exits non-zero with the offending route and the failing assertion.

### Requirement: Mobile Hamburger

Below 720 px viewport, the primary nav SHALL collapse to a hamburger toggle. The baseline implementation MUST be CSS-only (checkbox pattern); a progressively-enhanced Astro island MAY add focus trap, Esc-close, and backdrop dismissal. The toggle MUST NOT require runtime JavaScript to function.

#### Scenario: JS-disabled hamburger still works

- **WHEN** a user with JavaScript disabled taps the hamburger at 480 px viewport
- **THEN** the menu opens and the four nav links are reachable via Tab.

#### Scenario: Esc closes the menu

- **WHEN** the menu is open and the user presses Esc
- **THEN** the menu closes and focus returns to the toggle button.

### Requirement: Footer Structure

`Footer.astro` SHALL render four columns (Platform, Developers, Company, Legal) plus a meta strip with copyright (`© {YEAR} Artagon, Inc. — Philadelphia, PA`), version string (`v{semver} — build {7-char git sha}`), and the stack credit line. Year MUST be auto-computed at build time. The theme toggle MUST live in the footer.

#### Scenario: Year auto-updates

- **WHEN** the site is rebuilt on or after 2027-01-01
- **THEN** the footer copyright reads `© 2027 Artagon, Inc. — Philadelphia, PA` without manual edits.

### Requirement: Per-route Metadata Emission

`BaseLayout.astro` MUST emit per-route `<title>`, `<meta name="description">` (80–160 chars), `<link rel="canonical">` (path-only against `https://artagon.com`, query-string-stripped), and OG/Twitter meta. The `description` value MUST come from the route's MDX frontmatter; hardcoded descriptions in `.astro` files are forbidden. The canonical URL MUST be constructed from `Astro.url.pathname` only (never `Astro.url.href`) so query strings (UTM, sessions) cannot appear in the canonical.

#### Scenario: Missing description fails lint

- **WHEN** a route renders without a `description` meta tag in the 80–160 char range
- **THEN** `scripts/lint-meta.mjs` exits non-zero citing the offending route and the actual length.

#### Scenario: Canonical resolves to absolute URL

- **WHEN** the `/platform` route is built
- **THEN** the canonical link is `<link rel="canonical" href="https://artagon.com/platform">`.

#### Scenario: Canonical strips query strings

- **WHEN** a UTM-tagged URL `/platform?utm_source=hn` is requested
- **THEN** the rendered canonical is `https://artagon.com/platform` (no `?` or query parameters); `scripts/lint-meta.mjs` MUST fail the build if any built HTML's canonical contains `?`.

### Requirement: Theme Toggle with Pre-Paint Bootstrap

The theme toggle SHALL be a `<button>` exposing its current state via `aria-pressed` (true when `data-theme="midnight"` is active). The toggle SHALL persist user choice in `localStorage.theme` and apply `<html data-theme>` before first paint via an inline bootstrap script. The inline script MUST be CSP-hashed by `scripts/csp.mjs`. The bootstrap script MUST validate `localStorage.theme` against the allow-list `['twilight', 'midnight']` and fall back to `twilight` for any other value. The bootstrap script MUST set `data-theme` via `document.documentElement.setAttribute('data-theme', validatedValue)` only; it MUST NOT use `innerHTML`, `outerHTML`, `Document.write` APIs, or string-concatenated attribute construction. `prefers-color-scheme: light` on first visit MUST map to `twilight`; first-visit dark preference MUST map to `twilight` (project default).

#### Scenario: No flash of unstyled theme

- **WHEN** a user with `localStorage.theme="midnight"` reloads the page
- **THEN** the page renders with `data-theme="midnight"` from first paint, no observable flicker to `twilight`, and the toggle button has `aria-pressed="true"` from first paint.

#### Scenario: Bogus localStorage value falls back safely

- **WHEN** an extension or attacker writes `localStorage.theme = 'x" onmouseover=alert(1) data-x="'`
- **THEN** the bootstrap script applies `data-theme="twilight"` (the safe fallback), the `<html>` element has no extra attributes, and no script executes.

### Requirement: BaseLayout Slot ABI

`BaseLayout.astro` MUST expose named slots (`<slot name="json-ld">`, `<slot name="indexation">`, `<slot name="branding">`) consumed by the per-route metadata pipeline. The capabilities `site-structured-data`, `site-indexation`, and `site-branding` MUST emit their head-level tags into these slots via dedicated wrapper components (`<JsonLd/>`, `<Indexation/>`, `<Branding/>`) rather than directly editing `BaseLayout.astro`. After Phase 3 of `tasks.md` lands the slot definitions, no further direct edits to `BaseLayout.astro` from the four BaseLayout-consuming capabilities MUST be required.

#### Scenario: JsonLd component mounts into slot

- **WHEN** a route's frontmatter declares `jsonLd: { ... }` and `BaseLayout.astro` is rendered
- **THEN** the `<slot name="json-ld">` receives the `<JsonLd/>` output and BaseLayout itself is unchanged.

#### Scenario: New capability adds head metadata without editing BaseLayout

- **WHEN** a follow-up change adds a new metadata category (e.g., `analytics`)
- **THEN** the change adds a new `<slot name="analytics">` to BaseLayout once, plus a wrapper component, and never edits BaseLayout's existing slots.

### Requirement: CSP Inline-Script Hash Drift Gate

`scripts/csp.mjs` MUST emit a `script-src` directive containing only `'self'` plus SHA-256 hashes of every inline `<script>` in `dist/`; the directive MUST NOT contain `'unsafe-inline'`. The build MUST fail if any inline `<script>` in `dist/` has a SHA-256 not present in the emitted CSP header. The hash list MUST cover ALL inline script sources, including but not limited to: the pre-paint theme-bootstrap script, Astro island hydration scripts emitted for the `/brand` Copy-SVG button, `TrustChainTooltip` Esc/focus handler, `WritingWidget` interactive bits, `NavToggle` hamburger island, `ThemeToggle` persistence handler. Astro emits island hydration as either inline `<script>` blocks or external `/_astro/*.js` modules — both paths MUST be covered (inline → SHA-256 in `script-src`; external → covered by `'self'` + SRI hash from `scripts/sri.mjs`). Editing any of these script bodies without rerunning `scripts/csp.mjs` MUST fail CI.

#### Scenario: Edited bootstrap without rehashing fails CI

- **WHEN** a contributor edits the inline theme-bootstrap script and commits without rerunning the postbuild
- **THEN** the next CI run fails with `scripts/csp.mjs` reporting the orphan SHA-256 and naming the offending route.

#### Scenario: 'unsafe-inline' rejected

- **WHEN** any contributor attempts to add `'unsafe-inline'` to `script-src`
- **THEN** `scripts/csp.mjs` exits non-zero rejecting the directive.
