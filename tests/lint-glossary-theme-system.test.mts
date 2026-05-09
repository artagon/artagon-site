// USMR Phase 5.5.16-pt188 — `.agents/context/glossary.md` Theme
// System section vs theme.css data-theme blocks sync gate.
//
// `.agents/context/glossary.md` is read by AI agents during
// onboarding (per the project's `.agents/` skill conventions). Its
// "Theme System" section enumerates the live theme variants. When
// theme variants are added/removed in `public/assets/theme.css`,
// the glossary MUST move in lockstep — otherwise agents document
// retired or never-existed themes to contributors.
//
// Pre-pt188 the section listed:
//   - `slate` — removed in pt167.
//   - `--brand-violet`, `--brand-sky` — never defined in
//     `public/assets/theme.css` (only mentioned in pt-comment
//     archaeology about pt81-deleted tokens).
//   - `ThemeToggle` — removed in pt166 as orphan (`ls
//     src/components/ThemeToggle.*` returns empty).
//
// Same documentation-vs-implementation drift class as pt176
// (DESIGN.md retired-alias prose), pt175 (AGENTS.md ast-grep
// table missing rows), pt167 (CLAUDE.md `slate` after slate
// variant removal — this is exactly the same `slate` mention
// surviving in a different doc surface), pt179 (AGENTS.md
// `tests/screen-reader.spec.ts` Phase-6 prose), pt180 (README.md
// `LogoVariants.astro` post-pt72 deletion).
//
// pt188 corrected the section to enumerate the real live themes
// (`dark` / `midnight` / `twilight`) and locks the contract here.
// The gate parses every `:root[data-theme="X"]` block in theme.css
// and asserts every X is documented in glossary.md's Theme System
// section, AND every theme name backticked in the section
// corresponds to a live theme block.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const GLOSSARY = join(ROOT, ".agents", "context", "glossary.md");
const THEME_CSS = join(ROOT, "public", "assets", "theme.css");

describe("glossary.md Theme System vs theme.css (pt188)", () => {
  test("theme variants in .agents/context/glossary.md match :root[data-theme=...] blocks in theme.css", () => {
    expect(existsSync(GLOSSARY), ".agents/context/glossary.md must exist").toBe(
      true,
    );
    expect(existsSync(THEME_CSS), "public/assets/theme.css must exist").toBe(
      true,
    );

    const cssBody = readFileSync(THEME_CSS, "utf8");
    // Strip comments — pt-narrative comments mention retired
    // theme names ("Pre-fix...") and would false-positive.
    const cssNoComments = cssBody.replace(/\/\*[\s\S]*?\*\//g, "");
    const liveThemes = new Set<string>();
    for (const m of cssNoComments.matchAll(
      /^\s*:root\[data-theme="([a-z][a-z0-9-]*)"\]\s*\{/gm,
    )) {
      liveThemes.add(m[1]!);
    }
    expect(
      liveThemes.size,
      "expected at least one :root[data-theme=...] block in theme.css",
    ).toBeGreaterThan(0);

    // Extract Theme System section from glossary. Section starts
    // at "## Theme System" heading and ends at the next "## "
    // heading or end-of-file. The naive `(?=…|$)` with `m` flag
    // matches end-of-LINE (not end-of-string) and over-truncates
    // — capture manually via indexOf instead.
    const glossBody = readFileSync(GLOSSARY, "utf8");
    const startIdx = glossBody.indexOf("## Theme System");
    if (startIdx === -1) {
      throw new Error("glossary.md must have a `## Theme System` section");
    }
    const afterHeading = glossBody.indexOf("\n", startIdx);
    const nextHeading = glossBody.indexOf("\n## ", afterHeading);
    const section =
      nextHeading === -1
        ? glossBody.slice(afterHeading)
        : glossBody.slice(afterHeading, nextHeading);

    // Documented themes: bullets that name a theme as the
    // bold-prefixed term, e.g. `- **midnight**: ...`. Lowercase
    // identifiers only — kebab-case. Excludes structural lines
    // like `**data-theme**`, `**ThemePreviewPanel**`, and
    // `**--brand-teal**` (CSS variables) by requiring the bold
    // term to be a-z and not contain `-` prefix or capital.
    const documented = new Set<string>();
    for (const m of section.matchAll(/^-\s*\*\*([a-z][a-z0-9]*)\*\*\s*:/gm)) {
      documented.add(m[1]!);
    }

    // Bidirectional set comparison.
    const inDocOnly = [...documented].filter((t) => !liveThemes.has(t)).sort();
    const onCssOnly = [...liveThemes].filter((t) => !documented.has(t)).sort();

    if (inDocOnly.length || onCssOnly.length) {
      const lines: string[] = [];
      if (onCssOnly.length) {
        lines.push(
          `Theme blocks in theme.css but missing from glossary.md Theme System: ${onCssOnly.join(", ")}`,
        );
      }
      if (inDocOnly.length) {
        lines.push(
          `Theme names in glossary.md Theme System with no theme.css :root[data-theme="..."] block: ${inDocOnly.join(", ")}`,
        );
      }
      throw new Error(
        `Theme System drift:\n${lines.join("\n")}\n` +
          `Fix: keep .agents/context/glossary.md Theme System section 1:1 with public/assets/theme.css :root[data-theme=...] blocks (live blocks only — comment archaeology is excluded by the gate).`,
      );
    }
    expect(inDocOnly.length).toBe(0);
    expect(onCssOnly.length).toBe(0);
  });
});
