// USMR Phase 5.5.16-pt133 — SVG accessibility-name gate.
//
// Every `<svg>` in the codebase MUST be reachable to assistive
// technology in exactly one of two ways:
//
//   1) Decorative: `aria-hidden="true"` (icon inside a labeled
//      button, brand glyph adjacent to wordmark text, etc.) so AT
//      skips it entirely. Best-practice also adds `focusable="false"`
//      to keep IE/Edge legacy from tab-stopping the SVG.
//
//   2) Meaningful: provide a name via `aria-label="…"`,
//      `aria-labelledby="…"`, or a child `<title>` element.
//
// An <svg> with neither pattern is a WCAG 1.1.1 (Non-text Content)
// regression — screen readers either announce the empty graphic
// ("graphic, graphic") or skip critical brand/state signals.
//
// Pre-pt133 the FaqSearch clear-search button shipped an icon SVG
// with no aria-hidden — the parent button had aria-label="Clear
// search" so the AT got "Clear search graphic" with the SVG
// half-announced. pt133 closed that case and added this gate.
//
// Scope: all .astro and .tsx files in src/.
//
// Allow-list: per-line `<!-- lint-svg-aria: ok -->` comment for
// deliberate exceptions (e.g. an inline data-viz where the SVG IS
// the meaningful content but the contract is satisfied via a
// description in surrounding prose).

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

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
  snippet: string;
}

// Walk each <svg ...> opening tag (multi-line aware) and assert one
// of the accessible-name strategies is present. The walker also
// inspects the immediate children for <title> as a name source.
function findUnnamedSvgs(body: string, rel: string): Finding[] {
  const findings: Finding[] = [];
  // Match each <svg ...> ... </svg> block, non-greedy. The body
  // includes children so we can detect <title> tags inside.
  const re = /<svg\b[\s\S]*?<\/svg>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const block = m[0];
    if (/lint-svg-aria:\s*ok/i.test(block)) continue;
    const hasAriaHidden = /\baria-hidden=["']true["']/.test(block);
    const hasAriaLabel = /\baria-label=["'][^"']+["']/.test(block);
    const hasAriaLabelledby = /\baria-labelledby=["'][^"']+["']/.test(block);
    const hasTitle = /<title\b[\s\S]*?>[\s\S]*?<\/title>/.test(block);
    if (hasAriaHidden || hasAriaLabel || hasAriaLabelledby || hasTitle) {
      continue;
    }
    const before = body.slice(0, m.index);
    const line = before.split("\n").length;
    findings.push({
      file: rel,
      line,
      snippet: block.split("\n")[0]!.slice(0, 100),
    });
  }
  return findings;
}

describe("SVG accessibility-name (WCAG 1.1.1)", () => {
  const files = walk(join(ROOT, "src"));

  test("walker discovered files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test("every <svg> has aria-hidden=true OR an accessible name", () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findUnnamedSvgs(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map(
          (f) =>
            `${f.file}:${f.line} — add aria-hidden="true" (decorative) OR aria-label / <title> (meaningful)\n    ${f.snippet}`,
        )
        .join("\n");
      throw new Error(
        `Found ${all.length} <svg> element${
          all.length === 1 ? "" : "s"
        } without accessible-name strategy:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
