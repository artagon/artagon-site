# Project Context

## Purpose

Artagon Web is the public marketing site and docs shell for the Artagon identity platform. It is a static Astro site deployed to GitHub Pages with the custom domain artagon.com.

## Scope and Goals

- Communicate the Artagon product story (platform, vision, roadmap, FAQ, etc.).
- Provide shells for docs, console, and search entry points.
- Maintain strong security headers via SRI and CSP postbuild.
- Keep high performance and accessibility scores (Lighthouse CI).
- Keep links healthy (Lychee link check).

## Tech Stack

### Core

- Astro 5 (ESM, static output)
- Node 20+ and npm
- @astrojs/sitemap

### Tooling

- Prettier (formatting)
- Cheerio (HTML postprocessing for SRI and CSP)
- Lighthouse CI (performance and a11y thresholds)
- Lychee (link checking)

## Project Structure

- `src/pages/` route pages (Astro). Key routes: `/`, `/platform`, `/vision`, `/roadmap`, `/faq`, `/developers`, `/docs`, `/console`, `/search`, `/get-started`, `/how`, `/status`, `/security`, `/privacy`, `/play`, `/404`.
- `src/layouts/BaseLayout.astro` shared layout, SEO tags, and inline theme/menu scripts.
- `src/components/` UI components, navigation, and SEO helpers.
- `src/data/` typed data for FAQ and roadmap content.
- `public/` static assets, icons, manifests, `docsearch.json`, and `_redirects`.
- `scripts/` postbuild security scripts and asset generation helpers.
- `deploy/` sample server configs and HSTS guidance.

## Build and Deploy

- `npm run dev` local dev server.
- `npm run build` produces `dist/` and runs `scripts/sri.mjs` and `scripts/csp.mjs`.
- `npm run preview` serves the static output.
- GitHub Actions deploys on pushes to `main` (GitHub Pages). Custom domain is `artagon.com` via `CNAME` and `public/CNAME`.

## Security and Performance

- `scripts/sri.mjs` injects integrity hashes for local JS and CSS and writes `dist/sri-manifest.json`.
- `scripts/csp.mjs` inserts a CSP meta tag with hashes for inline scripts; it adds DocSearch origins when enabled.
- CDN or origin minification must be disabled to avoid SRI mismatches.
- Lighthouse CI enforces performance, accessibility, best practices, and SEO thresholds.

## Constraints and Notes

- Astro config sets `output: "static"`, `trailingSlash: "never"`, and `site: "https://artagon.com"`.
- Sitemap excludes pages under `/_drafts/`.
- DocSearch is optional; credentials live in `public/docsearch.json`.
- Releases on tags create a zip of `dist/` via GitHub Actions.

## External Dependencies

- GitHub Pages for hosting.
- Optional Algolia DocSearch (via jsdelivr and Algolia endpoints).
