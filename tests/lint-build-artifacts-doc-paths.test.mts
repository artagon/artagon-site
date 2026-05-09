// USMR Phase 5.5.16-pt200 — `docs/build-artifacts.md` path-citation gate.
//
// `docs/build-artifacts.md` is the contributor-facing build-system
// reference. When the prose cites a literal repo-rooted path inside
// backticks, the path MUST exist on disk. Otherwise contributors
// follow references to scripts that don't ship and proposal
// directories that have been archived.
//
// Pre-pt200 the file had 3 drifts:
//   1. line 3 cited `openspec/changes/standardize-build-artifacts` —
//      the proposal archived to
//      `openspec/changes/archive/2026-05-05-standardize-build-artifacts/`
//      but the doc didn't get the post-archive path update.
//   2. line 126 listed `scripts/sanitize-trace.mjs` in the
//      CODEOWNERS dual-review surface — but the script was specced
//      in the archived proposal AND NEVER actually authored. Same
//      drift class as pt183 (`verify:design-md-telemetry` claimed
//      CI-wired but wasn't).
//   3. line 158 cited `openspec/changes/standardize-build-artifacts/
//      design.md` (same issue as #1).
//
// Same documentation-vs-implementation drift class as pt178-181
// (path-citation gates), pt190 (openspec/contributing.md tutorial
// path), pt191 (Copilot trio docs), pt183 (claim-vs-disk for
// scripts).
//
// pt200 corrected the 3 drifts and locks the contract here.
// Sibling of the existing 6-gate doc-citation set (pt178/179/180/
// 181/190/191) — extends coverage to `docs/build-artifacts.md`.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DOC = join(ROOT, "docs", "build-artifacts.md");

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

describe("docs/build-artifacts.md path citations vs disk (pt200)", () => {
  test("every literal repo-rooted path in build-artifacts.md prose resolves on disk", () => {
    expect(existsSync(DOC), "docs/build-artifacts.md must exist").toBe(true);

    const body = readFileSync(DOC, "utf8");
    const stripped = body.replace(/```[\s\S]*?```/g, "");

    const drifts: string[] = [];
    for (const m of stripped.matchAll(/`([^`]+)`/g)) {
      const raw = m[1]!.replace(/[,.;:)]+$/, "").trim();
      if (!looksLikePath(raw)) continue;
      // Skip placeholder-token paths.
      if (/<[^>]+>/.test(raw)) continue;
      if (raw.includes("YYYY-MM-DD")) continue;
      // Skip brace-expansion alternations and recursive globs.
      if (/[{}]/.test(raw)) continue;
      if (raw.includes("**")) continue;
      const cleaned = raw.split(":")[0]!;
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
        `docs/build-artifacts.md cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update the prose to cite the actual path on disk\n` +
          `  - If the path is a proposal that has archived, redirect to openspec/changes/archive/<date>-<id>/\n` +
          `  - If the path was a planned-but-never-authored artifact (e.g. a script never actually shipped), drop the reference\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
