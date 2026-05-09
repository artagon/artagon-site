// USMR Phase 5.5.16-pt189 — `.agents/context/glossary.md` Primary
// nav vs Header.astro NAV_LINKS sync gate.
//
// Sibling of pt188 (Theme System sync gate). The glossary's
// Navigation System §"Primary nav" entry must enumerate the same
// labels (in the same order) as `Header.astro` `NAV_LINKS`.
// Otherwise AI agents and contributors document a stale nav list —
// pt87 replaced the pre-USMR 4-item nav with the canonical 6-item
// list from `new-design/extracted/src/pages/index.html:560-567`,
// and the glossary still listed the pre-pt87 set ("Platform, How
// it works, Developers, Search, Docs, GitHub" — 4 of 6 labels
// were wrong).
//
// Same documentation-vs-implementation drift class as pt188
// (Theme System), pt176 (DESIGN.md retired-alias prose), pt175
// (AGENTS.md ast-grep table missing rows), pt167 (CLAUDE.md
// `slate` after slate variant removal).
//
// pt189 corrected the glossary entry and locks the contract here.
// The gate parses `NAV_LINKS = [...]` in Header.astro and the
// `**Primary nav**:` bullet in glossary.md, asserting the
// comma-separated label list matches in order.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const GLOSSARY = join(ROOT, ".agents", "context", "glossary.md");
const HEADER = join(ROOT, "src", "components", "Header.astro");

describe("glossary.md Primary nav vs Header.astro NAV_LINKS (pt189)", () => {
  test("Primary nav labels match the canonical NAV_LINKS array in order", () => {
    expect(existsSync(GLOSSARY), ".agents/context/glossary.md must exist").toBe(
      true,
    );
    expect(existsSync(HEADER), "src/components/Header.astro must exist").toBe(
      true,
    );

    // Parse Header.astro NAV_LINKS — frontmatter `const NAV_LINKS
    // = [{ href: ..., label: "..." }, ...]`. Extract the labels in
    // declaration order.
    const headerBody = readFileSync(HEADER, "utf8");
    const navMatch = headerBody.match(
      /const\s+NAV_LINKS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/,
    );
    if (!navMatch) {
      throw new Error(
        "Header.astro must declare a `const NAV_LINKS = [...] as const` array",
      );
    }
    const navBlock = navMatch[1]!;
    const headerLabels: string[] = [];
    for (const m of navBlock.matchAll(/label:\s*"([^"]+)"/g)) {
      headerLabels.push(m[1]!);
    }
    expect(headerLabels.length, "Header NAV_LINKS empty").toBeGreaterThan(0);

    // Parse glossary `**Primary nav**:` line. The labels are
    // comma-separated up to the first parenthesis or period.
    const glossBody = readFileSync(GLOSSARY, "utf8");
    const glossMatch = glossBody.match(
      /^- \*\*Primary nav\*\*:\s*([^()\n.]+)/m,
    );
    if (!glossMatch) {
      throw new Error(
        "glossary.md must have a `- **Primary nav**:` bullet under §Navigation System",
      );
    }
    const glossLabels = glossMatch[1]!
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Order-sensitive comparison: the canonical nav order is
    // load-bearing (Platform first communicates the platform-vs-
    // standards framing per Header.astro pt comment).
    if (glossLabels.length !== headerLabels.length) {
      throw new Error(
        `Primary nav drift — count mismatch:\n` +
          `  Header NAV_LINKS:    ${headerLabels.length} items: [${headerLabels.join(", ")}]\n` +
          `  glossary entry:      ${glossLabels.length} items: [${glossLabels.join(", ")}]\n`,
      );
    }
    for (let i = 0; i < headerLabels.length; i++) {
      if (glossLabels[i] !== headerLabels[i]) {
        throw new Error(
          `Primary nav drift at index ${i}:\n` +
            `  Header NAV_LINKS[${i}]: "${headerLabels[i]}"\n` +
            `  glossary entry[${i}]:    "${glossLabels[i]}"\n` +
            `  Full Header order: [${headerLabels.join(", ")}]\n` +
            `  Full glossary order: [${glossLabels.join(", ")}]\n`,
        );
      }
    }
    expect(glossLabels).toEqual(headerLabels);
  });
});
