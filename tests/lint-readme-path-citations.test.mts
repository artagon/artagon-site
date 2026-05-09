// USMR Phase 5.5.16-pt180 + pt239 — README.md path-citation gate.
//
// README.md is the contributor / external-reader landing page. When
// the prose cites a literal repo-rooted path inside backticks
// (`src/...`, `tests/...`, `scripts/...`, `public/...`, `.github/...`,
// `docs/...`, `openspec/...`, `rules/...`, `new-design/...`,
// `.claude/...`, `.agents/...`), the path MUST exist on disk —
// otherwise the README documents removed or never-existed
// infrastructure.
//
// pt239 extended the gate to also validate ROOT-LEVEL config files
// cited in backticks. Pre-pt239 the gate only matched paths
// starting with one of the directory prefixes above, so root-level
// citations like `astro.config.mjs` (which doesn't start with a
// directory prefix) slipped through. The gap was exposed when
// README.md cited `astro.config.mjs` while the actual file had
// migrated to `astro.config.ts`. pt239's fix: an explicit
// `ROOT_CONFIG_FILES` allow-list of legitimate root-level paths
// the gate validates against disk; anything in that set MUST
// resolve. Adding a new root config file (e.g.
// `prettier.config.mjs`) requires updating this list — the
// ceremony is intentional and prevents false-positive validation
// of arbitrary `<word>.<ext>` strings in prose (e.g. tool names
// like `npm` or version strings like `1.59.1`).
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

// Root-level config files the gate validates against disk when cited
// in README.md backticks (pt239). This is an explicit allow-list, NOT
// a shape heuristic — a shape heuristic (any `<basename>.<ext>` with
// no slash) over-matches on basename-only references that are
// actually subdirectory paths in inline prose (e.g. `faq.ts` for
// `src/data/faq.ts`, `deploy.yml` for `.github/workflows/deploy.yml`).
// The explicit list catches the genuine drift class — root-level
// configs that get renamed (pt239 found `astro.config.mjs` claimed
// to be a root file but the actual file migrated to
// `astro.config.ts`).
//
// Adding a new entry requires:
//   1. The file must actually exist at the repo root (the gate
//      validates this).
//   2. The README must cite it (otherwise the entry is unused).
const ROOT_CONFIG_FILES = new Set<string>([
  "astro.config.ts",
  "build.config.json",
  "build.config.ts",
  "package.json",
  "tsconfig.json",
  "lighthouserc.json",
  "lychee.toml",
  "vitest.config.ts",
  "playwright.config.ts",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "COPILOT.md",
  "DESIGN.md",
  "README.md",
  ".nvmrc",
  ".prettierrc",
  ".prettierignore",
  ".gitignore",
  ".mcp.json",
  "sgconfig.yml",
]);

// To detect drift on the OLD form of a renamed root file (e.g. pre-
// pt239 `astro.config.mjs`), we ALSO match a tight set of historical
// aliases: known stale spellings that would have been the canonical
// reference at some point. Adding to this set documents drift the
// gate should flag even though the new canonical form is in
// ROOT_CONFIG_FILES. Each entry's comment ties to the migration.
const ROOT_FILE_DRIFT_ALIASES = new Set<string>([
  // Pre-USMR-Phase-5.x the Astro config was `.mjs`. Migrated to `.ts`
  // when build.config.ts started exporting typed paths that need to
  // be imported (the `.mjs` form couldn't import `.ts`).
  "astro.config.mjs",
]);

// HISTORICAL allow-list (pt239) — backticked path citations that are
// archaeology, NOT live references. The pt239 fix included a one-line
// explanation in the README: "the legacy `astro.config.mjs` form was
// migrated to `.ts`". That single archaeology citation is exempt;
// the surrounding prose explicitly explains the migration.
//
// Same allow-list pattern as `tests/lint-automated-testing-doc-paths
// .test.mts` (pt203) and `tests/lint-agents-md-path-citations.test
// .mts` (pt238).
const HISTORICAL_ALLOW = new Set<string>([
  // pt239 — archaeology citation explaining the
  // `astro.config.mjs` → `astro.config.ts` migration.
  "astro.config.mjs",
]);

function looksLikePath(s: string): boolean {
  if (PATH_PREFIXES.some((p) => s.startsWith(p))) return true;
  if (ROOT_CONFIG_FILES.has(s)) return true;
  if (ROOT_FILE_DRIFT_ALIASES.has(s)) return true;
  return false;
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
      if (HISTORICAL_ALLOW.has(cleaned)) continue;
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
