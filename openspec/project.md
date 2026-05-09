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

- Astro 6 (ESM, static output; per `package.json` `"astro": "6.2.1"`)
- Node 22+ and npm (per `.nvmrc` 22.12 and `package.json` engines.node `>=22.0.0`)
- @astrojs/sitemap, @astrojs/mdx, @astrojs/react (for interactive islands only)
- Astro Content Collections + Zod schemas (`src/content/`)

### Tooling

- Prettier (formatting)
- Cheerio (HTML postprocessing for SRI and CSP)
- Lighthouse CI (performance and a11y thresholds)
- Lychee (link checking)
- Playwright (E2E + accessibility + visual regression)
- ast-grep (`sg`) — primary linter; rules in `rules/security/*.yml` (no ESLint)

## Project Structure

- `src/pages/` route pages (Astro). Live routes (22 total post-USMR-Phase-5.x): `/`, `/platform`, `/vision`, `/roadmap`, `/faq`, `/use-cases`, `/standards`, `/developers`, `/docs`, `/console`, `/search`, `/get-started`, `/how`, `/status`, `/security`, `/privacy`, `/play`, `/bridge`, `/writing`, `/writing/[slug]`, `/writing/feed.xml`, `/404`. The `/use-cases`, `/standards`, `/writing/[slug]`, `/writing/feed.xml` routes were added by USMR (live since Phase 5.x); the RSS feed gained auto-discovery wiring in pt197.
- `src/layouts/BaseLayout.astro` shared layout, SEO tags, and inline theme/menu scripts. USMR adds named slots: `json-ld`, `indexation`, `branding`.
- `src/components/` UI components, navigation, and SEO helpers.
- `src/content/` MDX/JSON content collections (`pages/`, `pages/writing/`, `taglines.json`, `standards.json`).
- `src/data/` typed data for FAQ and roadmap content.
- `public/` static assets, icons, manifests, `docsearch.json`, `_redirects`. (`_headers` is generated to `.build/dist/_headers` by `scripts/csp.mjs` per `migrate-deploy-to-cloudflare-pages`.)
- `scripts/` postbuild security scripts and asset generation helpers (`csp.mjs`, `sri.mjs`, `lint-tokens.mjs`, etc.).
- `deploy/` sample server configs and HSTS guidance.

## Capabilities (`openspec/specs/`)

Live capabilities: `build-config`, `check-site-quality`, `configure-copilot-environment`, `design-system-format`, `github-pages-deployment`, `manage-site-links`, `openspec-workflow`, `site-content`, `style-system`.

Capabilities introduced by `update-site-marketing-redesign` (deltas pending archive): `site-navigation`, `site-standards-registry`, `site-bridge-story`, `site-mobile-layout`, `site-structured-data`, `site-indexation`, `site-branding`. The change also MODIFIES `site-content` and `style-system`.

Other in-flight changes: `self-host-woff2-fonts` (NEW capability `font-self-hosting` + MODIFIED `style-system`), `migrate-deploy-to-cloudflare-pages` (NEW capability `cloudflare-pages-deployment` + MODIFIED `github-pages-deployment` + `check-site-quality`), `add-brand-assets-and-writing-pipeline` (depends on USMR archive), `migrate-legacy-tokens-to-layer` (stub; depends on USMR archive), `enhance-a11y-coverage` (NEW WCAG 2.1 AA contracts), `externalize-strings-and-add-i18n` (NEW capability `site-i18n` + MODIFIED `site-content`; authored as the parallel-track proposal during the USMR deep-audit ralph loop).

## Merge order

The canonical sequence (from `openspec/changes/FINAL-CROSS-CUTTING-REVIEW.md`):

1. `refactor-styling-architecture` — archived `2026-05-04`.
2. `adopt-design-md-format` — archived `2026-05-05`.
3. `update-site-marketing-redesign` — in flight (Phase 2 foundations merged via PR #43; Phases 5.x marketing routes shipped via USMR pt-iter ralph loop, currently in Phase 5.5.16-pt224 deep-audit cleanup).
4. `add-brand-assets-and-writing-pipeline` — blocked on #3.
5. `cleanup-new-design-extracted` — follow-up after #4.

`self-host-woff2-fonts` and `migrate-deploy-to-cloudflare-pages` are sequencing-independent and can land in either direction relative to USMR; their `package.json` postbuild-chain coordination is documented in each change's `proposal.md` Sequencing section.

## Build and Deploy

- `npm run dev` local dev server.
- `npm run build` produces `.build/dist/` (per `build.config.json`) and runs the postbuild chain (`scripts/sri.mjs`, `scripts/csp.mjs`, `lint:tokens`, etc.).
- `npm run preview` serves the static output.
- GitHub Actions deploys on pushes to `main` (GitHub Pages today; Cloudflare Pages parallel deploy planned per `migrate-deploy-to-cloudflare-pages`). Custom domain is `artagon.com` via `CNAME` and `public/CNAME`.

## Security and Performance

- `scripts/sri.mjs` injects integrity hashes for local JS and CSS and writes `.build/dist/sri-manifest.json`.
- `scripts/csp.mjs` inserts a CSP meta tag with hashes for inline scripts; it adds DocSearch origins when enabled.
- CDN or origin minification must be disabled to avoid SRI mismatches.
- Lighthouse CI enforces performance, accessibility, best practices, and SEO thresholds.

## Constraints and Notes

- Astro config sets `output: "static"`, `trailingSlash: "never"`, and `site: "https://artagon.com"`.
- Sitemap excludes pages under `/_drafts/`.
- DocSearch is optional; credentials live in `public/docsearch.json`.
- Releases on tags create a zip of `.build/dist/` via GitHub Actions.
- All runtime build/cache/report artifacts live under `.build/{cache,reports,dist}/`. Single SSoT: `build.config.json` at repo root, typed wrapper `build.config.ts`. TS configs `import { BUILD }`; JSON/YAML/TOML configs are GENERATED by `scripts/sync-build-config.mjs`. See `docs/build-artifacts.md`.
- All four in-flight changes' `/opsx:apply` phases consume `BUILD.*` constants from `build.config.ts` instead of hardcoded strings. The path constants are stable; the SSoT is `build.config.json`.
- **Precedence chain (canonical):** openspec/specs/\* govern behavior; DESIGN.md governs visual presentation; implementation traces to both. On conflict, the spec wins and DESIGN.md is updated in the same change. (DESIGN.md is at the repo root, governed by `adopt-design-md-format`.)
- `adopt-design-md-format` is a prerequisite for `update-site-marketing-redesign`. After this change archives, the redesign updates its own path references in its next commit (under the redesign's ownership).

## External Dependencies

- GitHub Pages for hosting.
- Optional Algolia DocSearch (via jsdelivr and Algolia endpoints).
