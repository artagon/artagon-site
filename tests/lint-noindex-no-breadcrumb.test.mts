// USMR Phase 5.5.16-pt150 — noindex pages MUST NOT emit
// BreadcrumbList JSON-LD.
//
// Schema.org BreadcrumbList rich-snippet tells crawlers "this URL
// exists as a navigable destination at position N in a hierarchy".
// `<meta name="robots" content="noindex">` tells crawlers "do NOT
// index this URL". Emitting both is the same mixed-signal class
// pt146 caught for the sitemap — Google parses the JSON-LD,
// imagines the breadcrumb as a navigable destination, and may
// still attempt to surface it in some rich-result contexts even
// while honoring the noindex directive.
//
// Pre-pt150 the /404 page shipped a "Home → 404" BreadcrumbList
// even though pt145 had noindexed it; same for the 8 shim/dev
// routes (privacy, how, security, status, docs, play, console,
// developers). pt150 added a `!isNoindex` guard to the
// breadcrumbLd emission in src/components/SeoTags.astro.
//
// This gate verifies the contract holds at build time.

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

describe("noindex pages have no BreadcrumbList JSON-LD (pt150)", () => {
  test("every built HTML with robots=noindex omits BreadcrumbList", () => {
    if (!existsSync(DIST)) {
      console.warn(
        `lint-noindex-no-breadcrumb: ${DIST} not found; skipping (run \`npm run build\` first).`,
      );
      return;
    }
    const files = walk(DIST);
    expect(files.length).toBeGreaterThan(0);
    const findings: Finding[] = [];
    for (const file of files) {
      const html = readFileSync(file, "utf8");
      // Two conditions must both be true to flag:
      //   1) The page declares robots=noindex (any combination,
      //      e.g. "noindex, nofollow")
      //   2) The page contains a BreadcrumbList JSON-LD block
      const hasNoindex =
        /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
      if (!hasNoindex) continue;
      // Match "@type": "BreadcrumbList" with optional whitespace.
      const hasBreadcrumb = /"@type"\s*:\s*"BreadcrumbList"/.test(html);
      if (hasBreadcrumb) {
        findings.push({ file: relative(ROOT, file) });
      }
    }
    if (findings.length > 0) {
      const lines = findings
        .map(
          (f) =>
            `${f.file} — declares robots=noindex AND emits BreadcrumbList JSON-LD (mixed crawler signal).`,
        )
        .join("\n");
      throw new Error(
        `Found ${findings.length} noindex-vs-breadcrumb contradiction${
          findings.length === 1 ? "" : "s"
        }:\n${lines}\nFix: ensure src/components/SeoTags.astro \`isNoindex\` guard correctly suppresses breadcrumbLd.`,
      );
    }
    expect(findings.length).toBe(0);
  });
});
