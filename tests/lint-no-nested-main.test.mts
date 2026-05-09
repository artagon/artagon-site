// USMR Phase 5.5.16-pt138 — no-nested-<main> gate.
//
// `src/layouts/BaseLayout.astro` provides the canonical
// `<main id="main-content" tabindex="-1">` wrapper around `<slot />`.
// That `<main>` is the SkipLink target and the WCAG 1.3.1 page
// landmark. Any page that ALSO wraps its content in `<main>` produces
// nested <main> elements at runtime — invalid HTML AND a duplicate
// landmark (each role/landmark type should appear only once unless
// labeled differently).
//
// pt138 caught 11 pages doing this:
//   - 404.astro
//   - roadmap, bridge, platform, use-cases, standards (simple wrappers)
//   - docs (with class="docs-main"), search (with class="search-page")
//   - get-started, writing/index, writing/[slug] (larger wrappers)
//
// The fix was to either drop the `<main>` (when it had no class /
// id beyond the redundant id="main") or convert to `<div>` (when
// the class was load-bearing for scoped CSS).
//
// Allow-list: per-line `<!-- lint-no-nested-main: ok -->` for any
// future case where a page genuinely needs its own labeled landmark.
// (Likely never — even sub-landmarks should be `<section>` /
// `<article>` / `<aside>`.)

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
  snippet: string;
}

function findPageMain(body: string, rel: string): Finding[] {
  // Strip block comments + JSX comments + HTML comments + line
  // comments so the post-pt138 prose mentions of `<main>` don't trip
  // the gate.
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
  const tagRe = /<main\b[\s\S]*?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(stripped)) !== null) {
    const tag = m[0];
    if (/lint-no-nested-main:\s*ok/i.test(tag)) continue;
    const before = stripped.slice(0, m.index);
    const line = before.split("\n").length;
    findings.push({
      file: rel,
      line,
      snippet: tag.replace(/\s+/g, " ").trim().slice(0, 100),
    });
  }
  return findings;
}

describe("no nested <main> in src/pages/* (BaseLayout owns the landmark)", () => {
  const files = walk(join(ROOT, "src", "pages"));

  test("walker discovered .astro pages", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test("no <main> elements in src/pages/* — BaseLayout provides the only one", () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findPageMain(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map(
          (f) =>
            `${f.file}:${f.line} — drop the page-level <main>; BaseLayout already wraps <slot /> in <main id="main-content">\n    ${f.snippet}`,
        )
        .join("\n");
      throw new Error(
        `Found ${all.length} page-level <main> wrapper${
          all.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
