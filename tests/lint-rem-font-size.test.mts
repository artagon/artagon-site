// USMR Phase 5.5.16-pt129 — rem→px discipline gate.
//
// pt19-22 established that island-layer font-sizes must be fixed-px
// to match canonical new-design contracts (which spec sizes as fixed
// integers like `fontSize: 16` in JSX inline styles). pt124 / pt127 /
// pt129 closed the remaining rem-based holdouts in src/components/
// + src/pages/ + src/styles/. This gate locks the convention going
// forward.
//
// Scope: src/components/, src/pages/, src/styles/
// (the active surfaces — every page-rendered file).
//
// Out of scope: public/assets/theme.css (the legacy layer that still
// has --space-* rem token defs and a few rem font-sizes in pre-USMR
// rules; those are tracked separately for a future sweep).
//
// Allow-list: a per-line `/* lint-rem-font-size: ok */` comment lets
// future contributors keep a rem value if there's a deliberate reason
// (e.g. an em-relative scale that must respond to user font-size
// preference). Set the marker on the same line as the declaration.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const SCANNED_DIRS = ["src/components", "src/pages", "src/styles"] as const;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (
      entry.endsWith(".css") ||
      entry.endsWith(".astro") ||
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

function findRemFontSizes(body: string, rel: string): Finding[] {
  // Strip block comments so prose mentions don't trip the gate.
  let stripped = body.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  if (rel.endsWith(".astro") || rel.endsWith(".tsx") || rel.endsWith(".jsx")) {
    stripped = stripped.replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, " "));
  }
  const findings: Finding[] = [];
  const lines = stripped.split("\n");
  const origLines = body.split("\n");
  // Pattern A: bare `font-size: <n>rem` declaration.
  // Pattern B: `font-size: clamp(<n>rem, ..., <n>rem)` — pt134 caught
  //   the regex hole pt129 left open: vision.css had 3 clamp() ranges
  //   in rem that the bare-rem scanner skipped.
  const remDecl = /font-size\s*:\s*[0-9.]+rem/;
  const remInClamp = /font-size\s*:\s*clamp\([^)]*[0-9.]+rem[^)]*\)/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const matchesBare = remDecl.test(line);
    const matchesClamp = remInClamp.test(line);
    if (!matchesBare && !matchesClamp) continue;
    const orig = origLines[i] ?? "";
    if (/lint-rem-font-size:\s*ok/i.test(orig)) continue;
    const m = line.match(/font-size\s*:\s*[^;]+;?/);
    findings.push({
      file: rel,
      line: i + 1,
      match: (m?.[0] ?? "").trim(),
    });
  }
  return findings;
}

describe("rem→px font-size discipline (pt19-22 / pt124 / pt127 / pt129)", () => {
  const files: string[] = [];
  for (const d of SCANNED_DIRS) {
    walk(join(ROOT, d), files);
  }

  test("walker discovered files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test("no `font-size: <rem>` in src/components|pages|styles", () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findRemFontSizes(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map(
          (f) =>
            `${f.file}:${f.line} — ${f.match} (convert to fixed-px; see USMR pt124/pt127/pt129)`,
        )
        .join("\n");
      throw new Error(
        `Found ${all.length} \`font-size: <rem>\` declaration${
          all.length === 1 ? "" : "s"
        } in scanned dirs:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
