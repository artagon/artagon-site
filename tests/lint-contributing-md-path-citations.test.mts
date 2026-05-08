// USMR Phase 5.5.16-pt181 — docs/CONTRIBUTING.md path-citation gate.
//
// `docs/CONTRIBUTING.md` is a contributor-onboarding entry point.
// New contributors land here from the GitHub repo "Contributing"
// link; AI agents land here when looking for OpenSpec workflow
// guidance. When the prose cites a literal repo-rooted path inside
// backticks (`src/...`, `tests/...`, `scripts/...`, `public/...`,
// `.github/...`, `docs/...`, `openspec/...`, `rules/...`,
// `new-design/...`, `.claude/...`, `.agents/...`), the path MUST
// exist on disk — otherwise the doc sends new contributors and
// agents chasing files that don't exist.
//
// Pre-pt181 line 12 cited `openspec/AGENTS.md` as one of three
// "authoritative workflow guidance" surfaces. The file doesn't
// exist; the canonical workflow guide is the root `AGENTS.md`
// (CLAUDE.md / GEMINI.md symlink to it). Same drift class as
// pt180 (README.md cited `openspec/AGENTS.md` × 3 plus 2 stale
// logo docs), pt179 (AGENTS.md `tests/screen-reader.spec.ts`
// Phase-6), pt178 (openspec spec `public/favicon.svg`).
//
// pt181 corrected the line-12 citation and locks the contract
// here. Sibling of pt178 (openspec specs), pt179 (AGENTS.md),
// pt180 (README.md). Together this 4-gate set covers every
// contributor / agent landing surface that documents project
// paths in present-tense prose.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DOC = join(ROOT, "docs", "CONTRIBUTING.md");

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

describe("docs/CONTRIBUTING.md path citations vs disk (pt181)", () => {
  test("every literal repo-rooted path in CONTRIBUTING.md prose resolves on disk", () => {
    expect(existsSync(DOC), "docs/CONTRIBUTING.md must exist").toBe(true);

    const body = readFileSync(DOC, "utf8");
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
        `docs/CONTRIBUTING.md cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update CONTRIBUTING.md to cite the actual path on disk\n` +
          `  - Restore the missing file (regression?)\n` +
          `  - If the path was removed, drop the CONTRIBUTING.md reference too\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
