import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BUILD } from "./build.config.ts";
import { isNoindexRoute } from "./src/lib/indexation.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * USMR Phase 10.1 / pt421 — read MDX frontmatter for a writing post
 * and return the canonical "last modified" date (ISO 8601). Prefers
 * `updated`; falls back to `published`. Returns null if neither
 * frontmatter field is set or the file doesn't exist.
 *
 * Hand-parses YAML frontmatter to avoid pulling in a parser
 * dependency at config-load time. The parser scope matches the
 * shapes the writing schema actually emits (date strings, optional
 * quotes); any future schema extension that introduces multi-line
 * date forms would need a real YAML parser.
 */
function readWritingLastmod(slug: string): string | null {
  const mdxPath = join(__dirname, "src", "content", "writing", `${slug}.mdx`);
  if (!existsSync(mdxPath)) return null;
  const body = readFileSync(mdxPath, "utf8");
  const match = body.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = match[1] ?? "";
  const updatedMatch = fm.match(/^updated:\s*(.+)$/m);
  const publishedMatch = fm.match(/^published:\s*(.+)$/m);
  const raw = (updatedMatch?.[1] ?? publishedMatch?.[1] ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (!raw) return null;
  // Astro's @astrojs/sitemap accepts either a Date or an ISO string;
  // we return ISO date-only (YYYY-MM-DD) because that's what the
  // frontmatter schema authors. The serializer pads as needed.
  return raw;
}

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
      // USMR Phase 10.1 / pt421 — bind <lastmod> to MDX
      // `updated`/`published` frontmatter for writing posts. The
      // default @astrojs/sitemap behavior would emit CI checkout
      // mtime, telling Google every page updated on every deploy
      // (per the spec: "NOT CI mtime"). Other routes (homepage,
      // marketing pages, writing index) skip lastmod — they don't
      // have a per-MDX date contract today, and emitting a stale
      // CI date would be worse than emitting none.
      //
      // The lastmod string is forwarded as-is from frontmatter
      // (date-only, e.g. "2026-05-08"); @astrojs/sitemap normalizes
      // to W3C Datetime Format. validate-indexation.mjs Check B
      // (pt418) becomes load-bearing once this hook ships — it
      // compares sitemap <lastmod> against the same MDX frontmatter,
      // catching drift between the two.
      serialize(item) {
        const m = item.url.match(/\/writing\/([^/]+)\/?$/);
        if (!m) return item;
        const slug = m[1]!;
        const lastmod = readWritingLastmod(slug);
        if (!lastmod) return item;
        return { ...item, lastmod };
      },
      customPages: [],
    }),
  ],
});
