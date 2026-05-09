import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { BUILD } from "./build.config.ts";
import { isNoindexRoute } from "./src/lib/indexation.ts";

export default defineConfig({
  site: "https://artagon.com", // canonical domain (matches CNAME)
  output: "static",
  trailingSlash: "never",
  outDir: BUILD.dist,
  cacheDir: BUILD.cache.astro,
  integrations: [
    mdx(),
    react(),
    sitemap({
      // USMR Phase 5.5.16-pt146 — exclude `noindex` routes from the
      // sitemap. Pre-pt146 the sitemap shipped every route including
      // the pages that carry `<meta name="robots" content="noindex,
      // nofollow">`. That contradicts the per-page header — Google
      // parses the sitemap, fetches the URL, sees noindex, gets a
      // mixed signal and may still attempt to index. The sitemap is
      // for indexable pages only; noindex pages should be
      // discoverable via internal navigation but absent from the
      // crawl-allowlist.
      //
      // USMR Phase 10.0 / pt416: NOINDEX_ROUTES extracted to
      // `src/lib/indexation.ts` as the single source of truth.
      // Pre-pt416 the list was inlined here (10 routes); BaseLayout
      // / SeoTags / robots.txt / validate-indexation.mjs all now
      // consume the same typed module so the lists stay in lockstep.
      filter: (page) => {
        if (page.includes("/_drafts/")) return false;
        return !isNoindexRoute(page);
      },
      customPages: [],
    }),
  ],
});
