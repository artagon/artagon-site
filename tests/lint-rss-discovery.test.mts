// USMR Phase 5.5.16-pt197 — RSS feed auto-discovery gate.
//
// `src/pages/writing/feed.xml.ts` generates a valid RSS 2.0 feed at
// `/writing/feed.xml` (1.4 KB, validated by the build). But until
// pt197, NO surface emitted the canonical RSS auto-discovery link
// element — browser RSS extensions, feed aggregators, and indexer
// crawlers can't find a feed without:
//
//   <link rel="alternate" type="application/rss+xml"
//         title="..." href="/writing/feed.xml" />
//
// in the document `<head>`.
//
// Pre-pt197 `rtk rg "rss|application/rss" src/components/
// src/layouts/ src/pages/writing/` returned only the
// `feed.xml.ts` import. The feature was effectively undiscoverable
// by anything that doesn't follow internal links to `/writing/`
// AND happen to know the canonical `feed.xml` filename.
//
// Same documentation-vs-implementation drift class as pt179
// (Phase-6 test claimed to drive but didn't), pt183 (verify:
// design-md-telemetry npm script defined but no caller), pt195
// (LHCI URLs benchmarking non-canonical forms). Different
// surface (HTML auto-discovery vs runtime feature wiring) but
// same shape: a feature exists but its discovery surface is
// missing.
//
// pt197 added the `<link>` to `SeoTags.astro` so every page
// (BaseLayout pulls SeoTags into every route) advertises the
// feed. Locks the contract here. The gate scans every built
// `.build/dist/**/*.html` page and asserts the RSS-discovery
// `<link>` element is present, points at `/writing/feed.xml`,
// and uses the correct `type="application/rss+xml"` MIME.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, ".build", "dist");
const FEED_RELATIVE = "/writing/feed.xml";

function gatherHtml(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      gatherHtml(p, out);
    } else if (entry.name.endsWith(".html")) {
      out.push(p);
    }
  }
}

describe("RSS auto-discovery `<link>` (pt197)", () => {
  test('every built .html page advertises /writing/feed.xml via <link rel="alternate" type="application/rss+xml">', () => {
    expect(
      existsSync(DIST),
      `${DIST} must exist; run \`npm run build\` first`,
    ).toBe(true);

    // The feed itself must exist on disk too — discovery without
    // the target file is useless.
    const feedAbs = join(DIST, "writing", "feed.xml");
    expect(
      existsSync(feedAbs) && statSync(feedAbs).isFile(),
      `${feedAbs} must exist (build must emit the feed)`,
    ).toBe(true);

    const html: string[] = [];
    gatherHtml(DIST, html);
    expect(
      html.length,
      "expected at least one built .html page under .build/dist/",
    ).toBeGreaterThan(0);

    const drifts: string[] = [];
    for (const f of html) {
      const body = readFileSync(f, "utf8");
      // Match `<link rel="alternate" type="application/rss+xml"
      // ... href="/writing/feed.xml">` with attributes in any
      // order. Tolerate single + double quotes.
      const re =
        /<link\b[^>]*\brel\s*=\s*["']alternate["'][^>]*\btype\s*=\s*["']application\/rss\+xml["'][^>]*\bhref\s*=\s*["']\/writing\/feed\.xml["'][^>]*\/?>/i;
      // Also allow attribute-order variations: rel/href/type, rel/type/href, etc.
      const reAlt =
        /<link\b[^>]*\bhref\s*=\s*["']\/writing\/feed\.xml["'][^>]*\btype\s*=\s*["']application\/rss\+xml["'][^>]*\brel\s*=\s*["']alternate["'][^>]*\/?>/i;
      const reAlt2 =
        /<link\b[^>]*\btype\s*=\s*["']application\/rss\+xml["'][^>]*\brel\s*=\s*["']alternate["'][^>]*\bhref\s*=\s*["']\/writing\/feed\.xml["'][^>]*\/?>/i;
      const reAlt3 =
        /<link\b[^>]*\btype\s*=\s*["']application\/rss\+xml["'][^>]*\bhref\s*=\s*["']\/writing\/feed\.xml["'][^>]*\brel\s*=\s*["']alternate["'][^>]*\/?>/i;
      if (
        !re.test(body) &&
        !reAlt.test(body) &&
        !reAlt2.test(body) &&
        !reAlt3.test(body)
      ) {
        drifts.push(f.replace(DIST, ""));
      }
    }

    if (drifts.length > 0) {
      throw new Error(
        `${drifts.length} built page(s) miss the RSS auto-discovery <link>:\n` +
          drifts
            .slice(0, 10)
            .map((p) => `  - ${p}`)
            .join("\n") +
          (drifts.length > 10 ? `\n  ... and ${drifts.length - 10} more` : "") +
          `\n\nFix: ensure SeoTags.astro emits` +
          `\n  <link rel="alternate" type="application/rss+xml" title="..." href="${FEED_RELATIVE}" />` +
          `\n— and that every page renders SeoTags (BaseLayout currently does this for all routes).`,
      );
    }
    expect(drifts.length).toBe(0);
  });
});
