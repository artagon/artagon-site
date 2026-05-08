// USMR Phase 5.5.16-pt121 — guard against `transition: all` shorthand.
//
// `transition: all` animates every animatable property, including
// layout properties (width / margin / border-width / etc.). When a
// component has BOTH a hover style and a state-cycle (e.g. the trust
// chain auto-advances state every ~2 s while the user is also hovering
// a row), the two transitions can race and produce visible jitter —
// the user reported this as "when hovering with mouse on trust chain
// it vibrates" against `.trust-chain__stage`.
//
// Pre-pt120 the trust-chain stage row used `transition: all 0.45s`.
// Pt120 restricted it to the 3 properties the auto-cycle actually
// animates (border-color, background, box-shadow). Pt121 sweeps the
// remaining 5 sites and adds this gate so re-introduction trips CI.
//
// Allow-list: the comment lines that explain the restriction may
// reference the literal string `transition: all` — we strip block-
// comment ranges before scanning. We also allow `/* lint-transition-
// all: ok */` as a per-line escape hatch for any rare future case
// where animating every property is genuinely the desired behavior.

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

function findTransitionAll(body: string, rel: string): Finding[] {
  // Strip /* ... */ block comments (preserve newlines for line
  // accounting) so the explanatory pt121 comments don't trip the gate.
  let stripped = body.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  // Strip // line comments in JS/TS/JSX/TSX/Astro files.
  if (rel.endsWith(".astro") || rel.endsWith(".tsx") || rel.endsWith(".jsx")) {
    stripped = stripped.replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, " "));
  }
  const findings: Finding[] = [];
  // `transition: all` (with optional whitespace + word boundary). The
  // boundary keeps us from matching `transition: allow-discrete`
  // should that ever appear.
  const re = /transition\s*:\s*all\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const before = stripped.slice(0, m.index);
    const line = before.split("\n").length;
    // Pull the original (un-stripped) line so the per-line escape
    // hatch comment is visible.
    const origLine = body.split("\n")[line - 1] ?? "";
    if (/lint-transition-all:\s*ok/i.test(origLine)) continue;
    findings.push({ file: rel, line, match: m[0] });
  }
  return findings;
}

describe("transition: all shorthand detection", () => {
  const files = walk(join(ROOT, "src"));
  walk(join(ROOT, "public"), files);

  test("walker discovered files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test("no `transition: all` shorthand (enumerate the animated properties)", () => {
    const allFindings: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      const rel = relative(ROOT, file);
      allFindings.push(...findTransitionAll(body, rel));
    }
    if (allFindings.length > 0) {
      const lines = allFindings
        .map(
          (f) =>
            `${f.file}:${f.line} — ${f.match} (enumerate the animated properties; see USMR pt120/pt121)`,
        )
        .join("\n");
      throw new Error(
        `Found ${allFindings.length} \`transition: all\` occurrence${
          allFindings.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(allFindings.length).toBe(0);
  });
});
