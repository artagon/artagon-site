// USMR Phase 5.5.16-pt220 — `README.md` tool-version claims vs
// `package.json` deps sync gate.
//
// `README.md` §"Tech Stack" / §"Build Tools" enumerates the
// project's tools with explicit version numbers (e.g. "Prettier
// 3.8.3", "Astro v6.2.1"). When `package.json` updates a
// dependency version, the README MUST move in lockstep —
// otherwise contributors trust outdated version claims about
// what's installed.
//
// Pre-pt220 `README.md:118` cited "Prettier 3.6.2" but
// `package.json` declared `"prettier": "3.8.3"` (~3 patch
// versions stale).
//
// Same documentation-vs-implementation drift class as pt212/
// 213/214/219 (Astro+Node major drift) and pt213
// (openspec/config.yaml multi-version drift). pt220 narrows
// the focus from majors to specific X.Y.Z version claims in
// README — a finer-grained version-anchor check.
//
// pt220 corrected the Prettier version and locks the contract
// here. Walks every `**ToolName** X.Y.Z` pattern in README and
// asserts the version matches package.json's declared version
// for the matching dependency.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const README = join(ROOT, "README.md");
const PKG = join(ROOT, "package.json");

// Manual mapping from README tool-name → package.json dep key.
// Each entry MUST be paired with the `**ToolName**` form used
// in README's bullet lists.
const TOOL_TO_DEP: Record<string, string> = {
  Prettier: "prettier",
  Astro: "astro",
  Cheerio: "cheerio",
};

describe("README.md tool-version claims vs package.json (pt220)", () => {
  test("every `**Tool** X.Y.Z` claim in README matches the package.json declared version", () => {
    expect(existsSync(README), "README.md must exist").toBe(true);
    expect(existsSync(PKG), "package.json must exist").toBe(true);

    const body = readFileSync(README, "utf8");
    const pkg = JSON.parse(readFileSync(PKG, "utf8"));
    const deps: Record<string, string> = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const drifts: { tool: string; readme: string; declared: string }[] = [];

    // Match `**Tool** X.Y.Z` and `**[Tool](url)** X.Y.Z` in
    // bullet contexts. Optional `v` prefix on the version
    // (Astro uses "v6.2.1"; Prettier uses bare "3.8.3").
    const patterns = [
      /\*\*([A-Za-z][\w-]+)\*\*\s+v?(\d+\.\d+\.\d+)\b/g,
      /\*\*\[([A-Za-z][\w-]+)\]\([^)]+\)\*\*\s+v?(\d+\.\d+\.\d+)\b/g,
    ];

    for (const re of patterns) {
      for (const m of body.matchAll(re)) {
        const tool = m[1]!;
        const readmeVer = m[2]!;
        const depKey = TOOL_TO_DEP[tool];
        if (!depKey) continue; // Tool isn't tracked by this gate.
        const declared = deps[depKey];
        if (!declared) continue; // Dep isn't installed; skip.
        const declaredVer = declared.replace(/^[~^>=<]*/, "");
        if (readmeVer !== declaredVer) {
          drifts.push({ tool, readme: readmeVer, declared: declaredVer });
        }
      }
    }

    if (drifts.length > 0) {
      throw new Error(
        `${drifts.length} README.md tool-version claim(s) drift from package.json:\n` +
          drifts
            .map(
              (d) =>
                `  - ${d.tool}: README cites ${d.readme} but package.json declares ${d.declared}`,
            )
            .join("\n") +
          `\n\nFix: update README.md to cite the package.json-declared version (or update package.json + re-test if intentionally bumping).`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
