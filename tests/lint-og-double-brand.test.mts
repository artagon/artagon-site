// USMR Phase 5.5.16-pt148 — no-double-brand gate on built HTML.
//
// Pre-pt148 the og:image:alt template unconditionally appended
// ` — Artagon` to the page title. Every page passes a title that
// already ends with " — Artagon" per DESIGN.md §9.5 — so the alt
// rendered as "FAQ — Artagon — Artagon" / "Platform — Artagon —
// Artagon" / etc. The home page (which uses the brand-first
// "Artagon — {tagline}" carve-out from §9.5) rendered as "Artagon
// — Trusted Identity for Machines and Humans — Artagon".
//
// Both forms are accidental brand-doubling: SEO crawlers, social-
// preview unfurlers, and screen readers all surface the og:image:
// alt; double-brand reads as either typo / spam / template-bug.
//
// pt148 fixed by guarding the append: skip when the title starts
// with "Artagon " OR ends with " — Artagon". This gate verifies
// the contract holds across the whole built site by walking
// .build/dist/**/*.html and asserting no `content="..."` value
// contains "Artagon — Artagon" or "— Artagon — Artagon".
//
// The gate runs against the BUILT HTML, so it requires `npm run
// build` first. Skips gracefully if the dist tree is missing.

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
  match: string;
}

describe("no double-brand in built meta-tags (pt148)", () => {
  test("no `Artagon — Artagon` anywhere in built HTML meta content", () => {
    if (!existsSync(DIST)) {
      console.warn(
        `lint-og-double-brand: ${DIST} not found; skipping (run \`npm run build\` first).`,
      );
      return;
    }
    const files = walk(DIST);
    expect(files.length).toBeGreaterThan(0);
    const findings: Finding[] = [];
    // Pattern catches both flavours of the bug:
    //   "Artagon — Artagon"     (home brand-first append)
    //   "— Artagon — Artagon"   (canonical-suffix-page double-append)
    // The em-dash + space form is the only one the SeoTags template
    // could produce; checking for plain "Artagon Artagon" would
    // false-positive on legitimate prose mentions.
    const re = /Artagon\s—\sArtagon/;
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      if (!re.test(body)) continue;
      // Find the offending line for the error message.
      const lines = body.split("\n");
      const hit = lines.find((l) => re.test(l)) ?? "";
      findings.push({
        file: relative(ROOT, file),
        match: hit.trim().slice(0, 200),
      });
    }
    if (findings.length > 0) {
      const lines = findings.map((f) => `${f.file}\n    ${f.match}`).join("\n");
      throw new Error(
        `Found ${findings.length} double-brand "Artagon — Artagon" occurrence${
          findings.length === 1 ? "" : "s"
        } in built HTML:\n${lines}`,
      );
    }
    expect(findings.length).toBe(0);
  });
});
