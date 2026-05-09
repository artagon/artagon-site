// USMR Phase 5.5.16-pt143 — canonical page <title> format gate.
//
// DESIGN.md §9.5 mandates the format: `{Page Title} — Artagon` (with
// the home page exempt; its title is just `Artagon` because the
// trailing suffix would be redundant).
//
// pt143 caught 3 holdouts:
//   - /docs   "Artagon Docs"      -> "Docs — Artagon"
//   - /console "Artagon Console"  -> "Console — Artagon"
//   - /404    "404 — Page not found" -> "Page not found — Artagon"
//
// This gate asserts the pattern going forward.
//
// Scope: every static <Base title="..."> string literal in
// src/pages/**/*.astro. Dynamic `title={someVar}` (e.g. /vision,
// /writing/[slug]) is intentionally OUT of scope — those resolve to
// content-authored frontmatter and the gate can't statically verify
// them. Content authors are responsible for the format in the .mdx
// frontmatter; the lint:taglines gate covers some of that.
//
// Allow-list:
//   - Home (src/pages/index.astro): the title comes from
//     home.mdx ("Artagon — Trusted Identity for Machines and Humans")
//     which is acceptable per §9.5 ("home: just `Artagon`" — meaning
//     the trailing suffix is redundant; brand-first is fine).
//   - Per-line `<!-- lint-page-title-format: ok -->` for one-off
//     exceptions.

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
    } else if (entry.endsWith(".astro")) {
      out.push(full);
    }
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
  title: string;
  reason: string;
}

function findBadTitles(body: string, rel: string): Finding[] {
  // Strip block + JSX + HTML comments + line comments so prose
  // mentions don't trip the gate.
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
  // Match `title="..."` on Astro elements. Specifically scope to
  // <Base ... title="..."> by anchoring to the literal string-prop
  // form. This skips dynamic `title={…}` and HTML attribute
  // `title="…"` on <a> / <button> hover-tooltips.
  const re = /\btitle=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const title = m[1]!;
    const before = stripped.slice(0, m.index);
    const lineNum = before.split("\n").length;
    const orig = origLines[lineNum - 1] ?? "";
    if (/lint-page-title-format:\s*ok/i.test(orig)) continue;
    // Only check `title=` attributes that are definitively on a
    // `<Base ...>` element. Walk backwards from the title's line up
    // to the most recent JSX-element opener (`<X`) and check that
    // the element is `<Base`. This skips ShimPage's `title="..."`
    // h1-text prop, link hover-tooltips, etc.
    let elementName: string | null = null;
    for (let i = lineNum - 1; i >= 0 && i >= lineNum - 8; i--) {
      const ln = origLines[i] ?? "";
      const tagMatch = ln.match(/<([A-Za-z][A-Za-z0-9]*)/);
      if (tagMatch) {
        elementName = tagMatch[1] ?? null;
        break;
      }
    }
    if (elementName !== "Base") continue;
    // Allow the home brand-first pattern.
    if (/^Artagon\b/.test(title) && /^Artagon\s*—/.test(title)) {
      // "Artagon — <tagline>" form; home only.
      continue;
    }
    // Canonical: must end with " — Artagon".
    if (/\s—\sArtagon$/.test(title)) continue;
    findings.push({
      file: rel,
      line: lineNum,
      title,
      reason:
        "expected `{Page Title} — Artagon` (DESIGN.md §9.5); home may use `Artagon — {tagline}`",
    });
  }
  return findings;
}

describe("page <title> format (DESIGN.md §9.5)", () => {
  const files = walk(join(ROOT, "src", "pages"));

  test("walker discovered .astro pages", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test("every static <Base title='...'> follows `{Page} — Artagon`", () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findBadTitles(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map((f) => `${f.file}:${f.line} — title="${f.title}"\n    ${f.reason}`)
        .join("\n");
      throw new Error(
        `Found ${all.length} non-canonical page title${
          all.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
