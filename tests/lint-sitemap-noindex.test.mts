// USMR Phase 5.5.16-pt146 — sitemap noindex-respect gate.
//
// Pages carrying `<meta name="robots" content="noindex, nofollow">`
// MUST NOT appear in the generated sitemap.xml. Sitemap entries
// signal "crawl me" while a noindex meta tag signals "don't index";
// shipping both is a mixed signal that Google explicitly flags as
// a soft-404 / wasted-crawl-budget regression class.
//
// pt146 fixed the contradiction by adding a NOINDEX_ROUTES filter
// to the @astrojs/sitemap config in astro.config.ts. This gate
// asserts the contract holds at build time — for every page that
// declares `robots="noindex"`, verify that page's URL is absent
// from the generated `.build/dist/sitemap-0.xml`.
//
// The gate runs against the BUILT sitemap, so it requires `npm run
// build` to have produced the sitemap first. CI runs build before
// tests; local runs may need a fresh build (the gate skips itself
// gracefully if the sitemap doesn't exist yet).

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SITEMAP_PATH = join(ROOT, ".build", "dist", "sitemap-0.xml");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".astro")) {
      out.push(full);
    }
  }
  return out;
}

// Map a src/pages/*.astro file path to its public URL path.
// Examples:
//   src/pages/index.astro            -> /
//   src/pages/404.astro              -> /404
//   src/pages/privacy/index.astro    -> /privacy
//   src/pages/writing/[slug].astro   -> /writing/[slug]   (skipped — dynamic)
function srcPathToRoute(rel: string): string | null {
  // strip "src/pages/" prefix and ".astro" suffix
  let route = rel.replace(/^src\/pages\//, "").replace(/\.astro$/, "");
  // skip dynamic routes — sitemap entries for those are post-rendered
  if (route.includes("[")) return null;
  // index → ""
  route = route.replace(/(^|\/)index$/, "");
  return "/" + route;
}

interface Finding {
  file: string;
  route: string;
}

describe("sitemap respects per-page noindex (DESIGN.md SEO)", () => {
  test("walker discovers .astro pages", () => {
    const files = walk(join(ROOT, "src", "pages"));
    expect(files.length).toBeGreaterThan(10);
  });

  test("no page with robots=noindex appears in the built sitemap", () => {
    if (!existsSync(SITEMAP_PATH)) {
      // Gate skips gracefully if the sitemap hasn't been built yet
      // (developer convenience). CI builds before vitest, so this
      // path is exercised in pipeline runs.
      console.warn(
        `lint-sitemap-noindex: ${SITEMAP_PATH} not found; skipping (run \`npm run build\` first).`,
      );
      return;
    }
    const sitemap = readFileSync(SITEMAP_PATH, "utf8");
    const findings: Finding[] = [];
    const files = walk(join(ROOT, "src", "pages"));
    for (const file of files) {
      const rel = relative(ROOT, file);
      const body = readFileSync(file, "utf8");
      // Strip block + JSX + HTML + line comments before scanning
      // for the robots attribute so prose mentions don't trip
      // the gate.
      let stripped = body.replace(/\/\*[\s\S]*?\*\//g, (m) =>
        m.replace(/[^\n]/g, " "),
      );
      stripped = stripped.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (m) =>
        m.replace(/[^\n]/g, " "),
      );
      stripped = stripped.replace(/<!--[\s\S]*?-->/g, (m) =>
        m.replace(/[^\n]/g, " "),
      );
      stripped = stripped.replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, " "));
      // Look for `robots="noindex..."` (any value containing
      // "noindex"). The order of `noindex,nofollow` vs the reverse
      // doesn't matter — both expose the same crawl signal.
      if (!/\brobots=["'][^"']*noindex[^"']*["']/.test(stripped)) continue;
      const route = srcPathToRoute(rel);
      if (route === null) continue;
      // Sitemap URL form: `https://artagon.com${route}` (root form
      // is `https://artagon.com` with no trailing slash per the
      // astro.config.ts `trailingSlash: "never"` setting).
      const sitemapUrl =
        route === "/" ? "https://artagon.com" : `https://artagon.com${route}`;
      if (sitemap.includes(`<loc>${sitemapUrl}</loc>`)) {
        findings.push({ file: rel, route });
      }
    }
    if (findings.length > 0) {
      const lines = findings
        .map(
          (f) =>
            `${f.file} (${f.route}) — declares robots="noindex" but appears in sitemap-0.xml`,
        )
        .join("\n");
      throw new Error(
        `Found ${findings.length} sitemap-noindex contradiction${
          findings.length === 1 ? "" : "s"
        }:\n${lines}\nFix: extend the NOINDEX_ROUTES filter in astro.config.ts.`,
      );
    }
    expect(findings.length).toBe(0);
  });
});
