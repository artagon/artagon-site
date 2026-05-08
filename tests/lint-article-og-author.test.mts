// USMR Phase 5.5.16-pt154 — article:author OG meta tag coverage.
//
// pt151 fixed Article JSON-LD to ship `author: Person` on every
// /writing/{slug}. But pt151 only updated the JSON-LD, not the
// Open Graph namespace. Facebook / LinkedIn / Slack unfurlers
// rely on `<meta property="article:author" content="...">` (an OG
// namespace tag), not on JSON-LD. Pre-pt154 every blog post
// rendered an unfurled card with no author byline, while the
// JSON-LD (used by Google rich-results) had the right name —
// inconsistent across the two sibling structured-data namespaces.
//
// This gate ensures parity: every page that ships `og:type=article`
// MUST also ship `article:author`. It runs against the built HTML
// in `.build/dist/**/*.html` and asserts the parity for every
// type=article route.

import { describe, expect, test } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, ".build", "dist");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

interface Finding {
  file: string;
}

describe("article OG author coverage (pt154)", () => {
  test("every page with og:type=article also ships article:author", () => {
    if (!existsSync(DIST)) {
      console.warn(
        `lint-article-og-author: ${DIST} not found; skipping (run \`npm run build\` first).`,
      );
      return;
    }
    const findings: Finding[] = [];
    for (const file of walk(DIST)) {
      const html = readFileSync(file, "utf8");
      const isArticle =
        /<meta[^>]*property=["']og:type["'][^>]*content=["']article["']/.test(
          html,
        );
      if (!isArticle) continue;
      const hasAuthor =
        /<meta[^>]*property=["']article:author["'][^>]*content=["'][^"']+["']/.test(
          html,
        );
      if (!hasAuthor) {
        findings.push({ file: relative(ROOT, file) });
      }
    }
    if (findings.length > 0) {
      const lines = findings
        .map(
          (f) =>
            `${f.file} — ships og:type=article but missing article:author OG meta`,
        )
        .join("\n");
      throw new Error(
        `Found ${findings.length} article-typed page${
          findings.length === 1 ? "" : "s"
        } without article:author:\n${lines}\nFix: ensure /writing/[slug].astro passes \`author\` to <Base> and SeoTags emits the meta tag.`,
      );
    }
    expect(findings.length).toBe(0);
  });
});
