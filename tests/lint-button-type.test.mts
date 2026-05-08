// USMR Phase 5.5.16-pt137 — <button> type-attribute gate.
//
// HTML <button> elements default to `type="submit"` when used inside
// a <form>. A button with no explicit type is therefore a latent
// regression class: a future contributor who wraps the surrounding
// markup in a <form> (for any reason — search, filtering, login)
// will silently change the button's behavior to "submit the form on
// click", which often reloads the page and discards state.
//
// The fix is one line: every <button> carries an explicit
// `type="button"` (or `type="submit"` if that IS the intent). React
// .tsx files in this codebase already follow the convention; pt137
// closes the .astro side and locks the contract project-wide.
//
// Allow-list: per-line `<!-- lint-button-type: ok -->` comment for
// deliberate omissions (e.g. a button outside any form context where
// the author wants the absence to express "this is dead code, do
// not touch"). Set on the same line as the `<button` opening tag.

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

function findUntyped(body: string, rel: string): Finding[] {
  // Strip block comments + JSX comments + HTML comments + line
  // comments so prose mentions don't trip the gate.
  let stripped = body.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  stripped = stripped.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  stripped = stripped.replace(/<!--[\s\S]*?-->/g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  if (rel.endsWith(".astro") || rel.endsWith(".tsx")) {
    stripped = stripped.replace(/\/\/[^\n]*/g, (m) => m.replace(/./g, " "));
  }

  const findings: Finding[] = [];
  // Walk every <button> opening tag (multi-line aware) until the
  // matching `>`. The opening may span several lines because of
  // attribute-per-line formatting.
  const tagRe = /<button\b[\s\S]*?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(stripped)) !== null) {
    const tag = m[0];
    if (/\btype=["'](?:button|submit|reset)["']/.test(tag)) continue;
    if (/lint-button-type:\s*ok/i.test(tag)) continue;
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

describe("<button> type attribute (UX regression class)", () => {
  const files = walk(join(ROOT, "src"));

  test("walker discovered files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test("every <button> carries explicit type=button|submit|reset", () => {
    const all: Finding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      all.push(...findUntyped(body, relative(ROOT, file)));
    }
    if (all.length > 0) {
      const lines = all
        .map(
          (f) =>
            `${f.file}:${f.line} — add type="button" (or "submit"/"reset")\n    ${f.snippet}`,
        )
        .join("\n");
      throw new Error(
        `Found ${all.length} <button> element${
          all.length === 1 ? "" : "s"
        } without explicit type:\n${lines}`,
      );
    }
    expect(all.length).toBe(0);
  });
});
