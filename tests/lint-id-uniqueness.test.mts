// USMR Phase 5.5.16-pt136 — ID uniqueness gate within each .astro
// or .tsx file.
//
// HTML validity (and WCAG 4.1.1 Parsing) require that every `id`
// attribute be unique within a document. Duplicate IDs silently
// break:
//   - `getElementById()` (returns only the first match)
//   - ARIA references (aria-labelledby/controls/describedby resolve
//     non-deterministically per browser)
//   - Skip-links and anchor jumps (browser scrolls to first match)
//   - Forms (label `for=...` activates only the first input)
//
// Per-file uniqueness is the strict gate target. Cross-file dupes
// can happen if two components on the same page each define the
// same ID — but most components are single-instance per page in
// this codebase, so per-file is high-coverage.
//
// Allow-list: per-line `<!-- lint-id-uniqueness: ok -->` comment
// for templated dupes (e.g. a list-render that reuses an ID across
// items, which is itself a regression class but sometimes
// intentional). Set on the same line as the second occurrence.

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
  id: string;
  lines: number[];
}

function findDuplicateIds(body: string, rel: string): Finding[] {
  // Strip block comments (CSS/TS), JSX `{/* */}` blocks, HTML
  // comments, and TS/JS line comments so prose mentions don't trip
  // the gate. Preserve newlines for line tracking.
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

  const idMap = new Map<string, number[]>();
  const re = /\bid=["']([a-zA-Z][a-zA-Z0-9_-]*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const id = m[1]!;
    const before = stripped.slice(0, m.index);
    const lineNum = before.split("\n").length;
    if (!idMap.has(id)) idMap.set(id, []);
    idMap.get(id)!.push(lineNum);
  }

  const origLines = body.split("\n");
  const findings: Finding[] = [];
  for (const [id, lines] of idMap) {
    if (lines.length < 2) continue;
    // Per-line allow-list opt-out: if ANY of the duplicate lines has
    // the marker, drop the whole finding (intentional template).
    const hasOptOut = lines.some((ln) => {
      const orig = origLines[ln - 1] ?? "";
      return /lint-id-uniqueness:\s*ok/i.test(orig);
    });
    if (hasOptOut) continue;
    findings.push({ file: rel, id, lines });
  }
  return findings;
}

describe("ID uniqueness within file (HTML validity / WCAG 4.1.1)", () => {
  const files = walk(join(ROOT, "src"));

  test("walker discovered files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test("no duplicate id= values within a single file", () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findDuplicateIds(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map(
          (f) =>
            `${f.file} — id="${f.id}" defined ${f.lines.length}× at lines ${f.lines.join(", ")}`,
        )
        .join("\n");
      throw new Error(
        `Found ${all.length} duplicate id${
          all.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
