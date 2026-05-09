// USMR Phase 5.5.16-pt196 — `tsconfig.json` paths alias consumer-presence
// gate.
//
// `tsconfig.json` `compilerOptions.paths` adds non-trivial cost to
// every TS / Astro / Vitest tooling pass — every alias entry forks
// the module resolver into a non-standard search path. When an
// alias has zero consumers, the cost is paid for nothing: dev
// servers, type checkers, and IDE tooling all consult the alias
// table on every resolution attempt.
//
// Pre-pt196 `tsconfig.json` declared `paths: { "~/*": ["src/*"] }`
// (paired with `baseUrl: "."`) but `rtk rg "from\s+['\"]~/" src/
// tests/` returned ZERO matches. The alias was dead config —
// likely a leftover from a different project template / scaffolder.
//
// Same orphan-cleanup class as pt163 (heroFont schema field —
// declared but no implementation), pt167 (slate CSS — defined but
// no `[data-theme="slate"]` consumer), pt168 (READING_WPM —
// constant exported but no caller), pt182 (orphan SVG), pt183
// (orphan npm scripts), pt192 (ink skill).
//
// pt196 deleted `paths` AND `baseUrl` from `tsconfig.json` (they
// were paired; removing one without the other leaves orphan-by-
// configuration). Locks the contract here. The gate enforces:
//
// - If `tsconfig.json` declares `paths` aliases, EVERY alias key
//   (modulo trailing `*`) MUST have at least one consumer in
//   `src/` / `tests/` / `scripts/` (matching `from "<alias>/..."`
//   or `import("<alias>/...")` patterns).
// - If `paths` is empty / absent, the gate passes vacuously
//   (post-pt196 baseline).
//
// Adding a new alias to `tsconfig.json` MUST be paired with at
// least one consumer or the gate fails — prevents the same
// drift from re-entering.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TSCONFIG = join(ROOT, "tsconfig.json");

function gather(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".astro" ||
        entry.name === ".build"
      ) {
        continue;
      }
      gather(p, out);
    } else if (/\.(astro|tsx?|jsx?|mts|mjs)$/.test(entry.name)) {
      out.push(p);
    }
  }
}

describe("tsconfig.json paths alias consumer-presence (pt196)", () => {
  test("every paths alias declared in tsconfig.json has at least one consumer", () => {
    expect(existsSync(TSCONFIG), "tsconfig.json must exist").toBe(true);
    // tsconfig.json may include `// comments` despite being labeled
    // .json — the TS parser accepts JSONC. Strip comments before
    // JSON.parse to avoid false negatives.
    const raw = readFileSync(TSCONFIG, "utf8");
    const stripped = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    const cfg = JSON.parse(stripped);

    const paths = cfg?.compilerOptions?.paths;
    if (!paths || typeof paths !== "object") {
      // No paths declared — vacuously passes.
      expect(true).toBe(true);
      return;
    }

    const consumerFiles: string[] = [];
    gather(join(ROOT, "src"), consumerFiles);
    gather(join(ROOT, "tests"), consumerFiles);
    gather(join(ROOT, "scripts"), consumerFiles);
    if (consumerFiles.length === 0) {
      // No source files to scan; gate has no signal — leave it
      // permissive rather than failing on pristine repos.
      expect(true).toBe(true);
      return;
    }

    const corpus = consumerFiles
      .filter((p) => existsSync(p) && statSync(p).isFile())
      .map((p) => readFileSync(p, "utf8"))
      .join("\n");

    const orphans: string[] = [];
    for (const aliasKey of Object.keys(paths)) {
      // Strip trailing `/*` — the import form drops the wildcard
      // and adds the actual subpath. E.g. `~/*` → `~/foo/bar`.
      const prefix = aliasKey.replace(/\/\*$/, "");
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Match `from "<prefix>/..."`, `import("<prefix>/...")`,
      // or `require("<prefix>/...")` patterns.
      const re = new RegExp(
        `(?:from|import|require)\\s*\\(?\\s*['"\`]${escaped}/`,
      );
      if (!re.test(corpus)) orphans.push(aliasKey);
    }

    if (orphans.length > 0) {
      throw new Error(
        `${orphans.length} tsconfig.json paths alias(es) have no consumer:\n` +
          orphans.map((a) => `  - ${a}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Wire the alias into a real import (e.g. \`import x from "${orphans[0]?.replace(/\/\*$/, "")}/foo"\`)\n` +
          `  - Remove the alias from tsconfig.json paths (per CLAUDE.md "if you are certain that something is unused, you can delete it completely")\n`,
      );
    }
    expect(orphans.length).toBe(0);
  });
});
