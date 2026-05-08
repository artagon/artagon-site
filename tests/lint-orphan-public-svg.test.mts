// USMR Phase 5.5.16-pt182 — orphan public/assets/*.svg gate.
//
// Pivot from the pt178-pt181 doc-citation gates to implementation
// drift. Assets committed under `public/assets/` (root level)
// MUST have at least one consumer in the codebase: a source file,
// a script, a test, a config, or the public webmanifest. Otherwise
// the file is dead weight that ships in the deploy bundle and
// confuses contributors who treat its presence as evidence of
// active use.
//
// Pre-pt182 `public/assets/logo-wordmark.svg` (583 bytes,
// committed Nov 11) had zero consumers in `src/`, `scripts/`,
// `tests/`, or `public/site.webmanifest`. The only mentions were
// in `public/assets/logos/README.md` (doc), `scripts/icons/
// VERIFICATION.md` (doc), and `scripts/icons/README.md` (doc) —
// all describing variants, not consuming the SVG. The mate
// `public/assets/logo-mark.svg` IS consumed (`scripts/icons/
// make-icons.sh:9` reads it as `SVG_MARK`); the wordmark variant
// was vestigial after pt72 ("remove 3 orphan logo + Difference
// components") cleared most of the dead logo infrastructure.
//
// pt182 deletes the orphan and locks the contract here. Scope is
// deliberately narrow:
//
// - SVGs only: PNG variants like `logo-wordmark-{200,400,800}.png`
//   live under `public/assets/logos/` and are referenced via
//   templated paths (`logo-${size}.png`) that the gate can't
//   reliably resolve. Adding PNGs would require expression-aware
//   path resolution; out of scope here.
// - `public/assets/*.svg` only (root level): SVGs nested inside
//   `public/assets/logos/` or future subdirs are scoped by their
//   own README/index file and can be addressed in a follow-up.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ASSETS = join(ROOT, "public", "assets");

function gather(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".astro" ||
        entry.name === ".build" ||
        entry.name === "new-design"
      ) {
        continue;
      }
      gather(p, out);
    } else if (
      /\.(astro|tsx?|jsx?|mts|mjs|html|css|scss|json|webmanifest|toml|yml|yaml|sh)$/.test(
        entry.name,
      )
    ) {
      out.push(p);
    }
  }
}

describe("public/assets/*.svg consumer-presence (pt182)", () => {
  test("every root-level public/assets/*.svg is referenced by a source/script/config", () => {
    expect(existsSync(ASSETS), "public/assets/ must exist").toBe(true);

    const svgs = readdirSync(ASSETS, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".svg"))
      .map((e) => e.name);

    expect(
      svgs.length,
      "expected at least one root-level SVG under public/assets/",
    ).toBeGreaterThan(0);

    // Build a corpus of consumer files. Docs (`.md`) are NOT
    // consumers — they describe assets but don't ship code that
    // references them at runtime/build time.
    const consumers: string[] = [];
    gather(join(ROOT, "src"), consumers);
    gather(join(ROOT, "scripts"), consumers);
    gather(join(ROOT, "tests"), consumers);
    gather(join(ROOT, "public"), consumers); // manifest, robots.txt, etc.
    gather(join(ROOT, ".github"), consumers);
    consumers.push(join(ROOT, "package.json"));
    consumers.push(join(ROOT, "astro.config.ts"));
    consumers.push(join(ROOT, "playwright.config.ts"));
    consumers.push(join(ROOT, "vitest.config.ts"));
    consumers.push(join(ROOT, "build.config.ts"));
    consumers.push(join(ROOT, "build.config.json"));

    const corpus = consumers
      .filter((p) => existsSync(p) && statSync(p).isFile())
      .map((p) => readFileSync(p, "utf8"))
      .join("\n");

    const orphans: string[] = [];
    for (const svg of svgs) {
      // Match by basename; SVGs at the root level have unique
      // names and aren't loaded via template strings (would
      // require subdir traversal).
      if (!corpus.includes(svg)) {
        orphans.push(`public/assets/${svg}`);
      }
    }

    if (orphans.length > 0) {
      throw new Error(
        `${orphans.length} root-level public/assets/*.svg(s) have no consumer:\n` +
          orphans.map((o) => `  - ${o}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Wire the SVG into a consumer (component, script, manifest, config)\n` +
          `  - Delete the orphan (per CLAUDE.md: "If you are certain that something is unused, you can delete it completely.")\n`,
      );
    }

    expect(orphans.length).toBe(0);
  });
});
