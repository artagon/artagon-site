// USMR Phase 5.5.16-pt171 — orphan CSS-token regression gate.
//
// pt169 + pt170 caught 6 orphan CSS tokens (--muted, --fs-small,
// --fs-micro, --space-8, --space-10, --space-12) — each defined in
// public/assets/theme.css with ZERO real consumers anywhere in the
// codebase. The detection took two refinements:
//
//   1. Naive regex-over-source for `var(--name)` falsely counts
//      comment text as a consumer (pt169 caught --muted only because
//      its sole reference was inside a comment).
//   2. Stripping all 4 comment forms (block /* */, JSX {/* */},
//      HTML <!-- -->, line // ) before var() scanning is the correct
//      approach (pt170 caught the remaining 5 orphans this way).
//
// pt171 codifies the pattern as a permanent regression gate. Every
// CSS custom property defined in public/assets/theme.css MUST have
// at least one real consumer (var() reference outside any comment)
// somewhere in src/ or public/.
//
// Allow-list: per-line `/* lint-orphan-tokens: ok */` marker on a
// token def to mark it as intentionally future-reserved. Use
// sparingly — the discipline is "every token has a consumer".

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const THEME_CSS = join(ROOT, "public", "assets", "theme.css");

function walk(dir: string, out: string[] = []): string[] {
  const SKIP = new Set([
    "node_modules",
    ".build",
    ".git",
    ".astro",
    "new-design",
  ]);
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP.has(entry)) continue;
      walk(full, out);
    } else if (
      /\.(css|astro|tsx?|mdx?|jsx?|json)$/.test(entry) &&
      !entry.startsWith(".")
    ) {
      out.push(full);
    }
  }
  return out;
}

// Strip ALL 4 comment forms before scanning for var() refs.
// Critical per pt169 — naive scanning falsely counts comment-only
// "Pre-fix used `var(--name)`..." mentions as real consumers.
function stripComments(body: string): string {
  let out = body;
  out = out.replace(/\/\*[\s\S]*?\*\//g, " "); // /* ... */
  out = out.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " "); // {/* ... */}
  out = out.replace(/<!--[\s\S]*?-->/g, " "); // <!-- ... -->
  out = out.replace(/\/\/[^\n]*/g, " "); // // ...
  return out;
}

describe("orphan CSS-token regression gate (pt171)", () => {
  test("every public/assets/theme.css custom-property def has at least one real consumer", () => {
    const css = readFileSync(THEME_CSS, "utf8");

    // Collect every `--name:` def in theme.css.
    // Exclude lines with the per-line allow-list marker.
    const defs = new Map<string, number>(); // name -> line number
    const lines = css.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const m = line.match(/^\s*(--[a-z][a-z0-9-]*)\s*:/);
      if (!m) continue;
      if (/lint-orphan-tokens:\s*ok/i.test(line)) continue;
      defs.set(m[1]!, i + 1);
    }

    // Walk all CSS / Astro / TSX / MDX / JSON files in src/ + public/
    // for var(--name) usage, with comments stripped.
    const used = new Set<string>();
    const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "public"))];
    for (const f of files) {
      const stripped = stripComments(readFileSync(f, "utf8"));
      for (const m of stripped.matchAll(/var\(\s*(--[a-z][a-z0-9-]*)/g)) {
        used.add(m[1]!);
      }
    }

    // Also count internal theme.css var() refs (a token defining
    // another token that's then consumed externally is alive).
    // The walk above already includes theme.css.

    const orphans: Array<{ name: string; line: number }> = [];
    for (const [name, line] of defs) {
      if (!used.has(name)) orphans.push({ name, line });
    }

    if (orphans.length > 0) {
      const detail = orphans
        .map(
          (o) =>
            `${relative(ROOT, THEME_CSS)}:${o.line} — ${o.name} has no real consumer (var() refs only inside comments don't count)`,
        )
        .join("\n");
      throw new Error(
        `Found ${orphans.length} orphan CSS token${
          orphans.length === 1 ? "" : "s"
        } in theme.css:\n${detail}\nFix: either consume the token or remove the def. Allow-list: trailing \`/* lint-orphan-tokens: ok */\` for deliberate future-reserved tokens.`,
      );
    }
    expect(orphans.length).toBe(0);
  });
});
