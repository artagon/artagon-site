// USMR Phase 5.5.16-pt203 — `docs/AUTOMATED_TESTING.md` path-citation gate.
//
// `docs/AUTOMATED_TESTING.md` is the test-system reference for
// contributors. When the prose cites a literal repo-rooted path
// inside backticks, the path MUST exist on disk OR appear in a
// HISTORICAL allow-list with documented rationale (the doc
// already narrates the transition).
//
// Pre-pt203 the doc had ZERO ACTIVE drift — the only flagged
// path was `src/content/config.ts`, cited at line 74:
//
//   "Config file existence (`src/content.config.ts` — Astro
//    v6 path; was `src/content/config.ts` pre-v6)"
//
// The line correctly narrates the Astro v5 → v6 migration:
//   - `src/content/config.ts` (pre-v6, the legacy directory-
//     based config location)
//   - `src/content.config.ts` (Astro v6+, the canonical
//     top-level location)
//
// The legacy path is referenced ONLY in this transition-
// narrative context. Removing the citation would erase load-
// bearing migration archaeology that helps contributors
// understand WHY there's a `.config` file at the top level
// (deviating from the convention of putting configs in their
// own subdir).
//
// pt203 is a no-fix iteration — the doc is currently correct.
// The gate locks the contract going forward: any non-historical
// drift in this doc fails CI; the single HISTORICAL entry has
// to stay tied to the v6-migration narrative or the gate is
// updated explicitly.
//
// Sibling of the now-9-gate doc-citation set (pt178/179/180/
// 181/190/191/200/201/202).

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DOC = join(ROOT, "docs", "AUTOMATED_TESTING.md");

const PATH_PREFIXES = [
  "src/",
  "tests/",
  "scripts/",
  "public/",
  ".github/",
  "docs/",
  "openspec/",
  "rules/",
  "new-design/",
  ".claude/",
  ".agents/",
];

function looksLikePath(s: string): boolean {
  return PATH_PREFIXES.some((p) => s.startsWith(p));
}

function resolveWildcard(literal: string): boolean {
  const dir = join(ROOT, dirname(literal));
  const pattern = basename(literal);
  if (!existsSync(dir)) return false;
  if (!statSync(dir).isDirectory()) return false;
  const re = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$",
  );
  return readdirSync(dir).some((entry) => re.test(entry));
}

describe("docs/AUTOMATED_TESTING.md path citations vs disk (pt203)", () => {
  test("every literal repo-rooted path resolves on disk", () => {
    expect(existsSync(DOC), "docs/AUTOMATED_TESTING.md must exist").toBe(true);

    const body = readFileSync(DOC, "utf8");
    const stripped = body.replace(/```[\s\S]*?```/g, "");

    // HISTORICAL allow-list — paths cited in transition-narrative
    // contexts where the doc explicitly explains the migration.
    // Each entry MUST tie to a specific documented narrative; the
    // gate's failure-mode hint says removing the entry requires
    // also rewriting the surrounding prose.
    const HISTORICAL = new Set<string>([
      // line 74 — Astro v5 → v6 migration narrative.
      // `src/content/config.ts` was the pre-v6 directory-based
      // config; v6 moved it to `src/content.config.ts` (top-
      // level). The doc cites BOTH paths to explain the
      // transition; removing the legacy path erases the WHY.
      "src/content/config.ts",
    ]);

    const drifts: string[] = [];
    for (const m of stripped.matchAll(/`([^`]+)`/g)) {
      const raw = m[1]!.replace(/[,.;:)]+$/, "").trim();
      if (!looksLikePath(raw)) continue;
      if (/<[^>]+>/.test(raw)) continue;
      if (raw.includes("YYYY-MM-DD")) continue;
      if (/[{}]/.test(raw)) continue;
      if (raw.includes("**")) continue;
      const cleaned = raw.split(":")[0]!;
      if (HISTORICAL.has(cleaned)) continue;
      if (/[*?\[]/.test(cleaned)) {
        if (!resolveWildcard(cleaned)) drifts.push(cleaned);
        continue;
      }
      if (!existsSync(join(ROOT, cleaned))) {
        drifts.push(cleaned);
      }
    }

    if (drifts.length > 0) {
      throw new Error(
        `docs/AUTOMATED_TESTING.md cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update the prose to cite the actual path on disk\n` +
          `  - For genuine migration-narrative archaeology (the doc explains the transition explicitly), add the path to HISTORICAL allow-list with a rationale comment\n` +
          `  - Drop the reference if it's stale\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
