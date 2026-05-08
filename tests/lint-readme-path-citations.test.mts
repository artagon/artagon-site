// USMR Phase 5.5.16-pt180 — README.md path-citation gate.
//
// README.md is the contributor / external-reader landing page. When
// the prose cites a literal repo-rooted path inside backticks
// (`src/...`, `tests/...`, `scripts/...`, `public/...`, `.github/...`,
// `docs/...`, `openspec/...`, `rules/...`, `new-design/...`,
// `.claude/...`, `.agents/...`), the path MUST exist on disk —
// otherwise the README documents removed or never-existed
// infrastructure.
//
// Pre-pt180 README cited:
//   1. `docs/LOGO_USAGE.md` (lines 496, 759) and
//      `docs/LOGO_CONVERSION_SUMMARY.md` (lines 497, 760) — both
//      documenting the `LogoVariants.astro` component which pt72
//      removed as orphan ("remove 3 orphan logo + Difference
//      components", commit 0d6e9c5). The README references
//      survived the component deletion by ~108 iters.
//   2. `openspec/AGENTS.md` (3 occurrences at lines 641, 736, 744)
//      — the file doesn't exist. The canonical workflow guide is
//      the root `AGENTS.md` (CLAUDE.md / GEMINI.md symlink to it);
//      the README's symlink direction was also inverted.
//
// Same documentation-vs-implementation drift class as pt179
// (AGENTS.md `tests/screen-reader.spec.ts`), pt178 (openspec spec
// `public/favicon.svg`), pt177 (DESIGN.md `.num-h2` planned
// promise), pt176 (DESIGN.md retired-alias prose).
//
// pt180 deleted the two stale logo docs, corrected the OpenSpec
// agent-guide path + symlink direction, and locks the contract
// here. Sibling of pt178 (openspec specs), pt179 (AGENTS.md).

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const README = join(ROOT, "README.md");

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

describe("README.md path citations vs disk (pt180)", () => {
  test("every literal repo-rooted path in README.md prose resolves on disk", () => {
    expect(existsSync(README), "README.md must exist").toBe(true);

    const body = readFileSync(README, "utf8");
    // Strip code fences — illustrative snippets aren't a contract.
    const stripped = body.replace(/```[\s\S]*?```/g, "");

    const drifts: string[] = [];
    for (const m of stripped.matchAll(/`([^`]+)`/g)) {
      const raw = m[1]!.replace(/[,.;:)]+$/, "").trim();
      if (!looksLikePath(raw)) continue;
      // Skip OpenSpec-workflow placeholder paths
      // (`openspec/changes/<change-id>/proposal.md`,
      // `openspec/changes/archive/YYYY-MM-DD-<change-id>/`) —
      // those document the naming convention, not literal files.
      // Skip brace-expansion alternations and recursive globs.
      if (/<[^>]+>/.test(raw)) continue;
      if (raw.includes("YYYY-MM-DD")) continue;
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
        `README.md cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update README.md to cite the actual path on disk\n` +
          `  - Restore the missing file (regression?)\n` +
          `  - If the path was removed, delete the README reference too\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
