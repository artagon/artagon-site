import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { BUILD } from "./build.config.ts";

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
      // the 10 pages that carry `<meta name="robots" content="noindex,
      // nofollow">` (404 + search + the 8 shim/dev pages: privacy,
      // how, security, status, docs, play, console, developers).
      // That contradicts the per-page header — Google parses the
      // sitemap, fetches the URL, sees noindex, gets a mixed signal
      // and may still attempt to index. The sitemap is for indexable
      // pages only; noindex pages should be discoverable via internal
      // navigation but absent from the crawl-allowlist.
      //
      // Listed by route segment so the matcher works for both
      // `/privacy` (root index) and any future nested noindex pages.
      filter: (page) => {
        if (page.includes("/_drafts/")) return false;
        const NOINDEX_ROUTES = [
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
        ];
        return !NOINDEX_ROUTES.some((r) => page.endsWith(r));
      },
      customPages: [],
    }),
  ],
});
