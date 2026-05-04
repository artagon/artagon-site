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
      filter: (page) => !page.includes("/_drafts/"),
      customPages: [],
    }),
  ],
});
