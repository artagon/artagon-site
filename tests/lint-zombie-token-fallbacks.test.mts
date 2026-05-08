// USMR Phase 5.5.16-pt92 — guard against zombie var(--token, fallback)
// patterns where the named token has been deleted from theme.css.
//
// Why: pt86/pt81 deleted ~30 legacy tokens (--text, --muted, --border,
// --brand-sky, --primary, --shadow, --ring, --ink, --bg-alt, etc.).
// Several rules elsewhere still referenced the deleted tokens via
// `var(--deleted, hardcoded-fallback)` syntax. CSS doesn't error on
// undefined tokens — it silently falls back to the literal value.
// Result: pages rendered with the hex fallback for ~2 weeks before
// pt91 caught it via Playwright probe.
//
// This guard scans all .css and .astro files for `var(--name, …)`
// patterns and verifies that `--name` is defined somewhere in
// theme.css. Patterns that match a deleted token name + fallback are
// flagged as zombie fallbacks.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const THEME_CSS = join(ROOT, "public/assets/theme.css");

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
      entry.endsWith(".jsx") ||
      entry.endsWith(".mdx")
    ) {
      out.push(full);
    }
  }
  return out;
}

function collectTokenDefs(body: string, defs: Set<string>): void {
  // Strip /* ... */ comments so prose mentions don't count as definitions.
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, "");
  // Match `--name:` declaration syntax — works for both global CSS rules
  // AND inline `style="--name: value"` attributes (which legitimately
  // scope per-instance custom properties).
  const re = /(?<=[\s{;"'])--([a-zA-Z][\w-]*)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    defs.add(m[1]!);
  }
}

function definedTokens(scanFiles: string[]): Set<string> {
  const defs = new Set<string>();
  // Always include theme.css (the canonical source).
  collectTokenDefs(readFileSync(THEME_CSS, "utf8"), defs);
  // Also include inline `style="--token: value"` definitions from .astro
  // / .tsx / .jsx / .mdx files. The `.ui-grid` family scopes
  // `--grid-min-width / --grid-gap / --grid-margin` via inline style.
  for (const file of scanFiles) {
    if (file === THEME_CSS) continue;
    if (
      !file.endsWith(".astro") &&
      !file.endsWith(".tsx") &&
      !file.endsWith(".jsx") &&
      !file.endsWith(".mdx")
    ) {
      continue;
    }
    collectTokenDefs(readFileSync(file, "utf8"), defs);
  }
  return defs;
}

interface ZombieFinding {
  file: string;
  line: number;
  token: string;
  fallback: string;
}

function findZombieFallbacks(
  body: string,
  rel: string,
  defs: Set<string>,
): ZombieFinding[] {
  const findings: ZombieFinding[] = [];
  // Strip /* ... */ comments to avoid matching prose.
  const stripped = body.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );
  // Match `var(--name, FALLBACK)` — require a comma (i.e. fallback present).
  // The fallback may itself contain nested var() calls, so capture
  // greedily up to the matching close paren.
  const re = /var\(\s*--([a-zA-Z][\w-]*)\s*,\s*([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const tokenName = m[1]!;
    const fallback = m[2]!.trim();
    if (defs.has(tokenName)) continue;
    const before = stripped.slice(0, m.index);
    const line = before.split("\n").length;
    findings.push({ file: rel, line, token: tokenName, fallback });
  }
  return findings;
}

describe("Zombie var(--deleted-token, fallback) detection", () => {
  const files = walk(join(ROOT, "src"));
  walk(join(ROOT, "public"), files);
  const defs = definedTokens(files);

  test("theme.css + inline styles define a non-empty token set", () => {
    expect(defs.size).toBeGreaterThan(50);
  });

  test("no zombie var() fallbacks anywhere in src/ or public/", () => {
    const allFindings: ZombieFinding[] = [];
    for (const file of files) {
      const body = readFileSync(file, "utf8");
      const rel = relative(ROOT, file);
      allFindings.push(...findZombieFallbacks(body, rel, defs));
    }
    if (allFindings.length > 0) {
      const lines = allFindings
        .map(
          (f) =>
            `${f.file}:${f.line} — var(--${f.token}, ${f.fallback}) — token undefined`,
        )
        .join("\n");
      throw new Error(
        `Found ${allFindings.length} zombie var() fallback${
          allFindings.length === 1 ? "" : "s"
        }:\n${lines}`,
      );
    }
    expect(allFindings.length).toBe(0);
  });
});
