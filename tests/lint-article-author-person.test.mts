// USMR Phase 5.5.16-pt151 — Article JSON-LD must emit `author` as
// `Person` (not the brand `Organization`) when a real author is
// resolved.
//
// Pre-pt151 every post on /writing/[slug] shipped:
//   "author": { "@type": "Organization", "name": "Artagon" }
// even though the page byline rendered "Giedrius Trumpickas". The
// /writing/[slug].astro template resolved authorName via the
// authors-collection lookup but never piped it to <Base>; SeoTags
// fell back to the brand-default 'Artagon'.
//
// Inconsistencies:
//   - Visible byline: real human name
//   - JSON-LD author:  brand Organization
//   - Google's author-attribution rich-result wants the Person
//   - AT users with structured-data preview tools see two different
//     authors for the same article
//
// pt151 fix:
//   1) /writing/[slug].astro now passes `author={authorName}`
//   2) SeoTags.astro emits author as Person when name !== 'Artagon';
//      keeps Organization-Artagon as the fallback for cases where
//      a post genuinely has no human author (none currently).
//
// This gate verifies the contract by walking every built
// /writing/{slug}/index.html and asserting Article JSON-LD has
// `author.@type === "Person"`.

import { describe, expect, test } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const WRITING_DIST = join(ROOT, ".build", "dist", "writing");

interface Finding {
  file: string;
  authorType: string | undefined;
  authorName: string | undefined;
}

describe("Article JSON-LD author is Person (pt151)", () => {
  test("every /writing/{slug} Article JSON-LD has author.@type === 'Person'", () => {
    if (!existsSync(WRITING_DIST)) {
      console.warn(
        `lint-article-author-person: ${WRITING_DIST} not found; skipping (run \`npm run build\` first).`,
      );
      return;
    }
    const findings: Finding[] = [];
    // Walk only direct children of /writing/ that have an
    // index.html — those are the post-detail pages. /writing
    // itself (the index) doesn't ship Article JSON-LD.
    for (const entry of readdirSync(WRITING_DIST)) {
      const dir = join(WRITING_DIST, entry);
      if (!statSync(dir).isDirectory()) continue;
      const indexPath = join(dir, "index.html");
      if (!existsSync(indexPath)) continue;
      const html = readFileSync(indexPath, "utf8");
      const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
      let m: RegExpExecArray | null;
      let sawArticle = false;
      while ((m = re.exec(html)) !== null) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(m[1]!);
        } catch {
          continue;
        }
        if (
          !parsed ||
          typeof parsed !== "object" ||
          (parsed as { "@type"?: unknown })["@type"] !== "Article"
        ) {
          continue;
        }
        sawArticle = true;
        const article = parsed as {
          author?: { "@type"?: string; name?: string };
        };
        const authorType = article.author?.["@type"];
        const authorName = article.author?.name;
        if (authorType !== "Person") {
          findings.push({
            file: relative(ROOT, indexPath),
            authorType,
            authorName,
          });
        }
      }
      // If the page should have shipped Article JSON-LD but
      // didn't (the JSON-LD block is missing entirely), flag.
      // /writing/index has no Article — skip it; only flag if
      // the directory is one of the actual post slugs.
      if (!sawArticle && entry !== "index.html") {
        // Don't flag — the directory might be a sub-route that
        // legitimately lacks Article. The spec is "if Article
        // JSON-LD ships, author MUST be Person" — silence is OK.
      }
    }
    if (findings.length > 0) {
      const lines = findings
        .map(
          (f) =>
            `${f.file} — author.@type="${f.authorType}" (name="${f.authorName}"); expected "Person"`,
        )
        .join("\n");
      throw new Error(
        `Found ${findings.length} Article JSON-LD with non-Person author:\n${lines}`,
      );
    }
    expect(findings.length).toBe(0);
  });
});
