// USMR Phase 5.5.16-pt115 — guard against invalid `clamp(MIN, VAL,
// MAX)` syntax where the middle expression contains arithmetic
// (e.g. `0.65rem + 1vw`) WITHOUT a `calc()` wrap.
//
// CSS spec requires each clamp() argument to be a length. Bare
// `0.65rem + 1vw` is two tokens separated by `+`, not a length —
// the whole clamp() becomes unparseable and browsers fall back to
// the cascaded value silently. Pt114 caught a hero-sized FAQ h1
// because of this; pt115 caught the same pattern in `.faq-lead`.
//
// This test scans .css / .astro / .mdx / .tsx files for clamp(...)
// calls where any of the three args contains a `+` or `-` between
// length tokens but is NOT inside a calc() wrapper.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === ".build" ||
        entry === ".git" ||
        entry === "new-design"
      ) {
        continue;
      }
      walk(full, out);
    } else if (
      entry.endsWith(".css") ||
      entry.endsWith(".astro") ||
      entry.endsWith(".mdx") ||
      entry.endsWith(".tsx") ||
      entry.endsWith(".jsx")
    ) {
      out.push(full);
    }
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
  match: string;
}

// Match clamp(...) calls and check each comma-separated arg.
// A valid arg is either a single length / function call, or
// `calc(...)`. An invalid arg looks like `<token> +/- <token>`
// without being inside calc(). Approximation: flag any clamp()
// where any arg contains ` + ` or ` - ` (with surrounding spaces)
// but not `calc(`.
function findInvalidClamps(body: string, rel: string): Finding[] {
  // Strip /* ... */ block comments AND // line comments (when the file
  // type supports them — .astro / .tsx / .jsx) so prose mentions like
  // `// clamp(18-22px) per canonical` don't trip the gate.
  let stripped = body.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  if (rel.endsWith(".astro") || rel.endsWith(".tsx") || rel.endsWith(".jsx")) {
    stripped = stripped.replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, " "));
  }
  const findings: Finding[] = [];
  const re = /clamp\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const args = m[1]!.split(",");
    for (const arg of args) {
      const trimmed = arg.trim();
      // Has `+` or `-` between non-numeric tokens AND not wrapped
      // in calc(). The `[^a-z0-9]` guards prevent false positives
      // for negative numbers like `-0.5em`.
      if (/[a-z0-9)]\s*[+\-]\s*[a-z0-9.]/i.test(trimmed)) {
        if (!/^\s*calc\(/i.test(trimmed)) {
          const before = stripped.slice(0, m.index);
          const line = before.split("\n").length;
          findings.push({ file: rel, line, match: m[0] });
          break; // one finding per clamp() is enough
        }
      }
    }
  }
  return findings;
}

describe("Invalid clamp() syntax detection", () => {
  const files = walk(join(ROOT, "src"));
  walk(join(ROOT, "public"), files);

  test("walker discovered files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test("no clamp() with bare arithmetic args (must wrap in calc())", () => {
    const allFindings: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      const rel = relative(ROOT, file);
      allFindings.push(...findInvalidClamps(body, rel));
    }
    if (allFindings.length > 0) {
      const lines = allFindings
        .map(
          (f) =>
            `${f.file}:${f.line} — ${f.match.substring(0, 80)} (wrap arithmetic in calc())`,
        )
        .join("\n");
      throw new Error(
        `Found ${allFindings.length} invalid clamp() expression${
          allFindings.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(allFindings.length).toBe(0);
  });
});
