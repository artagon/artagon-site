// USMR Phase 5.5.16-pt135 — ARIA ID-reference integrity gate.
//
// WCAG 1.3.1 (Info and Relationships) requires that programmatic
// relationships between elements be determinable. The ARIA ID-
// reference attributes (`aria-controls`, `aria-describedby`,
// `aria-labelledby`, `aria-owns`, `aria-flowto`) MUST point to
// elements that actually exist in the DOM — a dangling reference
// silently breaks the AT relationship without any visible signal.
//
// Pre-pt135: Header.astro's nav-toggle button shipped
// `aria-controls="primary-nav"` but no element in the same file
// had `id="primary-nav"`. Screen-reader users got a "Toggle
// navigation, button, expanded" announcement with no destination
// element to navigate to. pt135 fixed it (added the id) and added
// this gate.
//
// Scope: every .astro and .tsx file in src/. The gate validates
// references PER-FILE — it doesn't catch cross-component refs.
// That's intentional: cross-file aria refs are rare in this
// codebase (they'd require orchestrating IDs across an Astro
// island boundary, which is anti-pattern), and validating them
// would require a full DOM snapshot per page route.
//
// Allow-list: per-line `<!-- lint-aria-refs: ok -->` comment for
// deliberate cross-component references. Set on the same line as
// the aria-* attribute.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const ARIA_REF_ATTRS = [
  "aria-controls",
  "aria-describedby",
  "aria-labelledby",
  "aria-owns",
  "aria-flowto",
] as const;

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
  attr: string;
  ref: string;
}

function findDanglingRefs(body: string, rel: string): Finding[] {
  // Strip block comments + JSX line comments so prose mentions don't
  // trip the gate. (Astro's frontmatter is JS — `// foo` strips OK.)
  let stripped = body.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  if (rel.endsWith(".astro") || rel.endsWith(".tsx")) {
    stripped = stripped.replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, " "));
  }
  // Strip Astro/JSX comment blocks: {/* ... */} and <!-- ... -->
  stripped = stripped.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  stripped = stripped.replace(/<!--[\s\S]*?-->/g, (m) =>
    m.replace(/[^\n]/g, " "),
  );

  // Collect every id="..." (or id={`literal`}) defined in the file.
  const definedIds = new Set<string>();
  const idStrLiteral = /\bid=["']([^"'{}]+)["']/g;
  let im: RegExpExecArray | null;
  while ((im = idStrLiteral.exec(stripped)) !== null) {
    definedIds.add(im[1]!);
  }
  // Also capture id={`literal`} template strings (no interpolation).
  const idTpl = /\bid=\{\s*`([^`${}]+)`\s*\}/g;
  while ((im = idTpl.exec(stripped)) !== null) {
    definedIds.add(im[1]!);
  }
  // And dynamic id={`prefix-${expr}`} — record the prefix so we can
  // soft-match aria refs like aria-controls={`prefix-${expr}`}.
  // Simpler: skip any aria ref that uses ${...} interpolation; we
  // only validate static-string refs.

  const findings: Finding[] = [];
  const origLines = body.split("\n");
  for (const attr of ARIA_REF_ATTRS) {
    const re = new RegExp(`\\b${attr}=["']([^"'{}]+)["']`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(stripped)) !== null) {
      const refValue = m[1]!;
      // Per-line allow-list opt-out.
      const before = stripped.slice(0, m.index);
      const lineNum = before.split("\n").length;
      const orig = origLines[lineNum - 1] ?? "";
      if (/lint-aria-refs:\s*ok/i.test(orig)) continue;
      // aria-* may carry a space-separated list of IDs; each must
      // resolve.
      const refs = refValue.split(/\s+/).filter(Boolean);
      for (const ref of refs) {
        if (!definedIds.has(ref)) {
          findings.push({
            file: rel,
            line: lineNum,
            attr,
            ref,
          });
        }
      }
    }
  }
  return findings;
}

describe("ARIA ID-reference integrity (WCAG 1.3.1)", () => {
  const files = walk(join(ROOT, "src"));

  test("walker discovered files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test("every aria-{controls,describedby,labelledby,owns,flowto} resolves", () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findDanglingRefs(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map(
          (f) =>
            `${f.file}:${f.line} — ${f.attr}="${f.ref}" — no element with id="${f.ref}" in this file`,
        )
        .join("\n");
      throw new Error(
        `Found ${all.length} dangling ARIA reference${
          all.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
