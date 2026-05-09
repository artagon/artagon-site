// USMR Phase 5.5.16-pt185 — orphan script imports gate.
//
// Every named or default import inside `scripts/**/*.{mjs,mts,js,ts}`
// MUST be referenced somewhere in the file outside the import
// statement itself. The project does not run a TypeScript or ESLint
// build over `scripts/` (they ship as raw `node` invocations from
// `npm run` / postbuild / CI workflows), so the language-server
// "noUnusedLocals" rule does not catch drift here. This gate
// closes the gap.
//
// Pre-pt185 the audit found 2 orphan imports:
//   1. `scripts/clean.mjs::statSync` — left over after a refactor
//      removed the only `statSync(...)` call.
//   2. `scripts/lint-tokens.mjs::relative` — destructured from
//      `node:path` but the body uses `dirname` / `join` / `resolve`
//      only.
//
// Same orphan-cleanup class as pt167 (slate CSS), pt163-pt168
// (dead schema fields), pt169 (`--muted`), pt170 (`--fs-small` /
// `--fs-micro` / `--space-8/10/12`), pt182 (orphan SVG), pt183
// (orphan npm scripts).
//
// pt185 removed the 2 orphans and locks the contract here. The
// gate runs across every committed `.mjs`/`.mts`/`.js`/`.ts` file
// under `scripts/` and named-imports / default-imports inside.
// It tolerates side-effect-only imports (no destructured ident,
// no default ident — e.g. `import "./foo.mjs"`) because those
// have no binding to check.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SCRIPTS_DIR = join(ROOT, "scripts");

function gather(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      gather(p, out);
    } else if (/\.(mjs|mts|js|ts)$/.test(entry.name)) {
      out.push(p);
    }
  }
}

describe("orphan imports in scripts/ (pt185)", () => {
  test("every named or default import in scripts/ is referenced in its file", () => {
    expect(existsSync(SCRIPTS_DIR), "scripts/ must exist").toBe(true);

    const files: string[] = [];
    gather(SCRIPTS_DIR, files);
    expect(
      files.length,
      "expected at least one .mjs / .mts / .js / .ts file under scripts/",
    ).toBeGreaterThan(0);

    const orphans: { file: string; ident: string }[] = [];

    for (const f of files) {
      const body = readFileSync(f, "utf8");

      // Named imports: `import { a, b as c, type d } from "..."`.
      // Multi-line braces are tolerated by the [^}] character class.
      for (const m of body.matchAll(
        /^\s*import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"][^'"]+['"]/gm,
      )) {
        const importStmt = m[0];
        const idents = m[1]!
          .split(",")
          .map((s) => s.trim())
          .map((s) => s.replace(/^type\s+/, ""))
          .map((s) => {
            // `Foo as Bar` — the locally-bound ident is `Bar`.
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

      // Default imports: `import Name from "..."`.
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
        `${orphans.length} orphan import(s) under scripts/:\n` +
          orphans.map((o) => `  - ${o.file}: ${o.ident}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Wire the imported binding into the script body\n` +
          `  - Remove the unused name from the import (per CLAUDE.md: "If you are certain that something is unused, you can delete it completely.")\n`,
      );
    }

    expect(orphans.length).toBe(0);
  });
});
