// USMR Phase 5.5.16-pt147 — canonical URL coverage gate.
//
// DESIGN.md §9.5 mandates "Canonical URL set on every page". The
// `<Base>` component delegates to SeoTags.astro, which derives
// the canonical from a `path` prop with a default of `/`.
//
// The default is dangerous: every page that forgets to pass
// `path="..."` ships <link rel="canonical" href="https://
// artagon.com/"> — telling Google the page is a duplicate of the
// home page. Pre-pt147 12 pages had this drift (404, privacy,
// how, security, faq, vision, status, docs, search, play,
// console, developers).
//
// Fix: every page passes `path="..."` to <Base>. This gate
// verifies the contract going forward — walks src/pages/**/*.astro
// (except dynamic [slug] routes which compute path at render time)
// and asserts each page's <Base> invocation carries an explicit
// path prop.
//
// Allow-list: per-line `<!-- lint-canonical-url: ok -->` for
// deliberate exceptions (none expected — every page has a unique
// canonical URL).

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
}

function isMissingPath(body: string): boolean {
  // Strip block + JSX + HTML + line comments so prose mentions
  // don't trip the gate.
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

  // Match the <Base ...> opening tag span. Multi-line aware: walks
  // from `<Base` to its closing `>`.
  const baseRe = /<Base\b[\s\S]*?>/g;
  const m = baseRe.exec(stripped);
  if (!m) return false;
  const tag = m[0];
  return !/\bpath=["'{]/.test(tag);
}

describe("canonical URL coverage (DESIGN.md §9.5)", () => {
  const files = walk(join(ROOT, "src", "pages"));

  test("walker discovered .astro pages", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test("every <Base> in src/pages passes a path= prop", () => {
    const findings: Finding[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file);
      // Skip dynamic [slug] routes — they compute path at render
      // time; the gate can only verify the static literal.
      if (rel.includes("[")) continue;
      const body = readFileSync(file, "utf8");
      if (/lint-canonical-url:\s*ok/i.test(body)) continue;
      // Skip files that don't use <Base> at all (none expected).
      if (!/<Base\b/.test(body)) continue;
      if (isMissingPath(body)) {
        findings.push({ file: rel });
      }
    }
    if (findings.length > 0) {
      const lines = findings
        .map((f) => `${f.file} — <Base> missing path= prop`)
        .join("\n");
      throw new Error(
        `Found ${findings.length} <Base> invocation${
          findings.length === 1 ? "" : "s"
        } without path= (canonical URL would default to https://artagon.com/):\n${lines}`,
      );
    }
    expect(findings.length).toBe(0);
  });
});
