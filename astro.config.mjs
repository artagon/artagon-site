import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://artagon.com", // canonical domain (matches CNAME)
  output: "static",
  trailingSlash: "never",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes("/_drafts/"),
      customPages: [],
    }),
  ],
});
