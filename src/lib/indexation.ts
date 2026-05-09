// USMR Phase 10.0 — single source of truth for routes excluded from
// search-engine indexing. Replaces the inline NOINDEX_ROUTES that
// shipped at `astro.config.ts:32-43` per USMR pt146.
//
// Consumed by:
//   - `astro.config.ts` sitemap filter (excludes these pages from
//     `sitemap-index.xml`)
//   - `src/components/SeoTags.astro` `robots` prop (per-page
//     `<meta name="robots" content="noindex, nofollow">` emission)
//   - `public/robots.txt` (manually maintained today; future
//     `scripts/generate-robots.mjs` is in Phase 10.3-onwards scope)
//   - `scripts/validate-indexation.mjs` (Phase 10.7 CI gate;
//     asserts meta-robots presence/absence per route, lastmod
//     parity, and same-origin _redirects destinations)
//
// Adding / removing routes:
//   1. Edit the array below.
//   2. Run `rtk npm run test:vitest` + `rtk node scripts/validate-indexation.mjs`
//      (once Phase 10.7 ships) to confirm sitemap, robots-meta, and
//      redirects stay in sync.
//   3. Per-page `<Base robots="noindex, nofollow">` on the route's
//      `index.astro` is still expected today (BaseLayout doesn't
//      auto-derive yet — pt417 / Phase 10.2 will consolidate); the
//      list and the prop must agree until the consolidation lands.
//
// Routes are matched via `endsWith()` (matching the pt146 sitemap-
// filter convention), so both `/privacy` and any future nested
// `/some/section/privacy` match. If you need exact-match-only,
// refactor consumers to use `NOINDEX_ROUTES.includes(path)`.

export const NOINDEX_ROUTES = [
  "/404",
  "/search",
  "/privacy",
  "/how",
  "/security",
  "/status",
  "/docs",
  "/play",
  "/console",
  "/developers",
] as const;

export type NoindexRoute = (typeof NOINDEX_ROUTES)[number];

/**
 * Returns true if the given URL path should be excluded from
 * indexing. Matches via `endsWith()` so future nested routes
 * inherit the parent's noindex status.
 *
 * @param pagePath - URL path (e.g. `/privacy` or `https://artagon.com/privacy`)
 */
export function isNoindexRoute(pagePath: string): boolean {
  return NOINDEX_ROUTES.some((r) => pagePath.endsWith(r));
}
