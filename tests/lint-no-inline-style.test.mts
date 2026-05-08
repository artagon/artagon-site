// USMR Phase 5.5.16-pt142 — no-inline-style gate.
//
// Inline `style="..."` attributes are problematic in this codebase:
//
// 1) **CSP**: a strict Content-Security-Policy with no `'unsafe-
//    inline'` directive (project default goal) blocks every inline
//    style attribute. The site currently runs without unsafe-inline
//    on stylesheets (postbuild SRI/CSP pass enforces it). Adding new
//    `style="..."` attrs silently chips away at that posture.
//
// 2) **Style budget**: the project's design-system contract lives in
//    component-scoped <style> blocks + theme.css token chains. Inline
//    styles bypass those layers, fragmenting the visual language. A
//    one-off `style="font-style: italic"` is a foot in the door for
//    the second one.
//
// 3) **Semantic alternatives**: when an inline style is necessary,
//    there's almost always a semantic HTML element that conveys the
//    same intent without bypassing CSS. pt142 caught
//    `<span class="serif" style="font-style: italic;">` and switched
//    to `<em class="serif">` — same render, semantic, no inline
//    style.
//
// Allow-list:
//   - `style="display: none"` for elements that JS toggles (the FAQ
//     clear-button + similar). Listed explicitly in ALLOWED_VALUES.
//   - Per-line `<!-- lint-no-inline-style: ok -->` for deliberate
//     exceptions (animation-frame manipulation, etc.).

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const ALLOWED_VALUES = new Set(["display: none", "display:none"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".astro") || entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
  value: string;
}

function findInlineStyles(body: string, rel: string): Finding[] {
  // Strip block + JSX + HTML + line comments so prose mentions of
  // `style=` don't trip the gate.
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

  const findings: Finding[] = [];
  const origLines = body.split("\n");
  // Match `style="..."` attribute. JSX `style={{...}}` is intentionally
  // out of scope (those are CSS-in-JS, evaluated at render — they
  // bypass the CSP `unsafe-inline` concern but are a separate
  // discipline question for the codebase).
  const re = /\bstyle=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    // Normalize: strip trailing semicolon + collapse whitespace so
    // "display: none;" / "display:none" / "display: none" all
    // compare equal against the ALLOWED_VALUES set.
    const value = m[1]!.trim().replace(/;$/, "").replace(/\s+/g, " ").trim();
    if (ALLOWED_VALUES.has(value)) continue;
    const before = stripped.slice(0, m.index);
    const lineNum = before.split("\n").length;
    const orig = origLines[lineNum - 1] ?? "";
    if (/lint-no-inline-style:\s*ok/i.test(orig)) continue;
    findings.push({ file: rel, line: lineNum, value });
  }
  return findings;
}

describe("no inline style= attributes (CSP + style-budget)", () => {
  const files = walk(join(ROOT, "src"));

  test("walker discovered files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test('no inline `style="..."` attrs (use scoped <style> or semantic HTML)', () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findInlineStyles(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map(
          (f) =>
            `${f.file}:${f.line} — style="${f.value}" (move to scoped <style> or use semantic HTML)`,
        )
        .join("\n");
      throw new Error(
        `Found ${all.length} inline style attribute${
          all.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
