// USMR Phase 5.5.16-pt222 — `@scope/pkg@X.Y.Z` version-claim
// drift gate, multi-doc.
//
// Scoped npm packages cited in docs as `@scope/pkg@X.Y.Z`
// (literal pin) MUST match the version declared in
// `package.json`. Otherwise contributors copy-pasting CI parity
// commands (`npx @scope/pkg@X.Y.Z ...`) or reading package
// references run a different version than CI does.
//
// Pre-pt222 `docs/AUTOMATED_TESTING.md:13` cited
// `@playwright/test@1.57.0` but `package.json` declares
// `"@playwright/test": "1.59.1"` (2 minor versions stale).
//
// Same documentation-vs-implementation drift class as pt220
// (Prettier patch-version drift in README), pt221 (`@lhci/cli`
// version drift in openspec/contributing.md). pt222 generalizes
// the pattern: walks every `@scope/pkg@X.Y.Z` mention across
// all .md / .yml / .yaml files under `.github/`, `docs/`,
// `openspec/` (excluding archive), and the top-level docs
// (AGENTS.md, README.md).
//
// Wildcard suffixes (`@0.15.x`) are tolerated as long as the
// MAJOR.MINOR matches; only the third component is wildcarded.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// Files explicitly excluded from the version-claim scan because
// they're rolling iter-logs / pt-narratives that quote past
// version states as part of explaining what changed. Adding
// to this set MUST be paired with a written rationale.
const NARRATIVE_ARCHAEOLOGY = new Set<string>([
  // USMR rolling-loop log — every pt commit appends a narrative
  // entry that quotes the OLD version cite as part of describing
  // what got fixed (e.g. pt221 narrative quotes
  // "@lhci/cli@0.14.x → 0.15.x"). Sanitizing those past tenses
  // would erase the load-bearing pt-history pointer.
  "openspec/changes/update-site-marketing-redesign/tasks.md",
]);

function gather(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip archived / vendored / build dirs.
      if (
        entry.name === "archive" ||
        entry.name === "new-design" ||
        entry.name === "node_modules" ||
        entry.name === ".build" ||
        entry.name === ".astro"
      ) {
        continue;
      }
      gather(p, out);
    } else if (/\.(md|yml|yaml)$/.test(entry.name)) {
      out.push(p);
    }
  }
}

describe("@scope/pkg@X.Y.Z version-claim drift gate (pt222)", () => {
  test("every literal `@scope/pkg@X.Y.Z` citation matches package.json", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const deps: Record<string, string> = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const files: string[] = [];
    gather(join(ROOT, ".github"), files);
    gather(join(ROOT, "docs"), files);
    gather(join(ROOT, "openspec"), files);
    for (const top of ["AGENTS.md", "README.md", "CLAUDE.md", "GEMINI.md"]) {
      const p = join(ROOT, top);
      if (existsSync(p) && statSync(p).isFile()) files.push(p);
    }

    const drifts: {
      file: string;
      pkg: string;
      doc: string;
      installed: string;
    }[] = [];

    for (const f of files) {
      const rel = relative(ROOT, f);
      if (NARRATIVE_ARCHAEOLOGY.has(rel)) continue;
      const body = readFileSync(f, "utf8");
      // Match `@scope/pkg@X.Y.Z` (literal pin) and
      // `@scope/pkg@X.Y.x` / `X.x` / `Y.x.x` (wildcard form).
      for (const m of body.matchAll(
        /@([a-z][a-z0-9-]+\/[a-z][a-z0-9-]+)@(\d+(?:\.\d+|\.x){0,2}|\d+\.\d+\.\d+)/g,
      )) {
        const name = m[1]!;
        const version = m[2]!;
        const key = "@" + name;
        const installed = deps[key];
        if (!installed) continue; // Package not in deps — skip.
        const installedVer = installed.replace(/^[~^>=<]*/, "");
        // Wildcard handling: `0.15.x` → require installed to
        // start with `0.15.`. `0.x.x` (rare) → installed must
        // start with `0.`.
        if (version.includes(".x")) {
          // Strip trailing `.x` segments and compare prefix.
          const prefix = version.replace(/(\.x)+$/, "");
          if (
            !installedVer.startsWith(prefix + ".") &&
            installedVer !== prefix
          ) {
            drifts.push({
              file: relative(ROOT, f),
              pkg: key,
              doc: version,
              installed: installedVer,
            });
          }
          continue;
        }
        if (installedVer !== version) {
          drifts.push({
            file: relative(ROOT, f),
            pkg: key,
            doc: version,
            installed: installedVer,
          });
        }
      }
    }

    if (drifts.length > 0) {
      throw new Error(
        `${drifts.length} @scope/pkg@X.Y.Z version drift(s):\n` +
          drifts
            .map(
              (d) =>
                `  - ${d.file}: cites ${d.pkg}@${d.doc} but package.json declares ${d.installed}`,
            )
            .join("\n") +
          "\n\nFix: update the doc to cite the package.json-declared version (or use a wildcard form like `0.15.x` to tolerate patch bumps within a minor).",
      );
    }

    expect(drifts.length).toBe(0);
  });
});
