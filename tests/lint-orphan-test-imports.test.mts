// USMR Phase 5.5.16-pt186 — orphan test imports gate.
//
// Sibling of pt185's `lint-orphan-script-imports.test.mts`. Test
// files under `tests/**/*.{spec,test}.{mts,mjs,ts,js}` MUST not
// carry orphan named or default imports — the project does not run
// strict TypeScript with `noUnusedLocals` over the tests/ tree
// (vitest has its own loose tsconfig; Playwright bundles run via
// Astro's tsc but with relaxed checks). This gate closes the gap.
//
// Pre-pt186 the audit found one orphan: `tests/styling-a11y.spec.
// ts:1` imported `type Page` from `@playwright/test` but the file
// never used the `Page` type — a leftover from an earlier helper
// signature.
//
// Same orphan-cleanup class as pt185 (script imports), pt182
// (orphan SVG), pt167 (slate CSS), pt163-pt168 (dead schema
// fields), pt169 (`--muted`), pt170 (`--fs-*` / `--space-*`).
//
// Difference from pt185: this gate's input includes test files
// that document the gate-pattern itself (this file, plus pt185's
// test file). Those carry JSDoc-comment example snippets like
// `// Named imports: \`import { a, b as c, type d } from "..."\`.`
// — syntactically identical to a real import statement. To avoid
// false positives the gate strips line + block comments before
// matching imports.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TESTS_DIR = join(ROOT, "tests");

function gather(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip fixtures/ — they're test inputs, not test code.
      if (entry.name === "fixtures") continue;
      gather(p, out);
      continue;
    }
    if (/\.(spec|test)\.(mts|mjs|ts|js)$/.test(entry.name)) {
      out.push(p);
    }
  }
}

// Anchoring imports to start-of-line is preferable to comment-
// stripping. The naive `/\*…\*/` regex eats embedded JS regex
// literals (e.g. `body.replace(/\/\*…\*\//g, …)` looks like a
// block comment to a string-level stripper). Imports in valid JS
// always start at column-0 after whitespace; identifiers in
// JSDoc-comment example snippets do NOT (they're inside `* ` or
// backtick prefixes), so the `^\s*import\b` anchor naturally
// excludes them.

describe("orphan imports in tests/ (pt186)", () => {
  test("every named or default import in tests/*.{spec,test}.{mts,mjs,ts,js} is referenced in its file", () => {
    expect(existsSync(TESTS_DIR), "tests/ must exist").toBe(true);

    const files: string[] = [];
    gather(TESTS_DIR, files);
    expect(
      files.length,
      "expected at least one test file under tests/",
    ).toBeGreaterThan(0);

    const orphans: { file: string; ident: string }[] = [];

    for (const f of files) {
      const body = readFileSync(f, "utf8");

      // Imports are always at start-of-line in valid JS. Anchor the
      // regex to `^\s*` (m flag) so JSDoc-comment example snippets
      // — which sit inside `* ` or backtick prefixes — never match.
      for (const m of body.matchAll(
        /^\s*import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"][^'"]+['"]/gm,
      )) {
        const importStmt = m[0];
        const idents = m[1]!
          .split(",")
          .map((s: string) => s.trim())
          .map((s: string) => s.replace(/^type\s+/, ""))
          .map((s: string) => {
            const aliasMatch = s.match(/^(\S+)\s+as\s+(\S+)$/);
            return aliasMatch ? aliasMatch[2]! : s;
          })
          .filter(Boolean);
        const bodyOutsideImport = body.replace(importStmt, "");
        for (const id of idents) {
          if (!new RegExp(`\\b${id}\\b`).test(bodyOutsideImport)) {
            orphans.push({ file: f.replace(ROOT, ""), ident: id });
          }
        }
      }

      for (const m of body.matchAll(
        /^\s*import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"][^'"]+['"]/gm,
      )) {
        const importStmt = m[0];
        const ident = m[1]!;
        const bodyOutsideImport = body.replace(importStmt, "");
        if (!new RegExp(`\\b${ident}\\b`).test(bodyOutsideImport)) {
          orphans.push({ file: f.replace(ROOT, ""), ident });
        }
      }
    }

    if (orphans.length > 0) {
      throw new Error(
        `${orphans.length} orphan import(s) under tests/:\n` +
          orphans.map((o) => `  - ${o.file}: ${o.ident}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Wire the imported binding into the test body\n` +
          `  - Remove the unused name from the import\n`,
      );
    }

    expect(orphans.length).toBe(0);
  });
});
