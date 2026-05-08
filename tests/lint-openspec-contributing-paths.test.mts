// USMR Phase 5.5.16-pt190 — `openspec/contributing.md` path-citation
// gate.
//
// `openspec/contributing.md` is the canonical contributor workflow
// guide for OpenSpec. When the prose cites a literal repo-rooted
// path inside backticks, the path MUST exist on disk OR appear in
// a documented tutorial-example allow-list. Otherwise contributors
// follow links to non-existent files.
//
// Pre-pt190 the file used `add-two-factor-auth` as a hypothetical
// change-id throughout the §"AI Agent Workflow (OpenSpec)" tutorial
// (15+ occurrences). Several backticked references read as literal
// paths in prose:
//   - line 190: "Commit body references: `openspec/changes/add-
//     two-factor-auth/`"
//   - line 426: "cat openspec/changes/add-two-factor-auth/tasks.md"
//
// pt190 added a clarifier at the top of the tutorial section
// disclosing that `add-two-factor-auth` is a hypothetical example.
// This gate locks the contract: every backticked repo-rooted path
// citation in the file MUST resolve on disk, with the tutorial-
// example token explicitly allow-listed.
//
// Same documentation-vs-implementation drift class as pt178
// (openspec spec `public/favicon.svg`), pt179 (AGENTS.md
// `tests/screen-reader.spec.ts` Phase-6), pt180 (README.md
// `LogoVariants.astro` post-pt72-deletion), pt181 (CONTRIBUTING.md
// `openspec/AGENTS.md` ghost path), pt188 (glossary.md slate after
// pt167 removal).

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DOC = join(ROOT, "openspec", "contributing.md");

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

// Allow-listed tutorial-example tokens. Each entry is a path
// substring that the gate treats as an explicit hypothetical.
// Adding a token here MUST be paired with prose in the doc that
// discloses the example status (otherwise contributors get
// confused by paths that look real but aren't).
const TUTORIAL_TOKENS = new Set<string>([
  // §"AI Agent Workflow (OpenSpec)" tutorial — pt190 added a
  // header clarifier that `add-two-factor-auth` is a hypothetical
  // change-id used throughout the worked examples.
  "add-two-factor-auth",
  // Generic placeholder forms — same convention as pt178/180/181.
  "<change-id>",
  "<spec-id>",
  "<capability>",
  "<your-change-id>",
]);

function looksLikePath(s: string): boolean {
  return PATH_PREFIXES.some((p) => s.startsWith(p));
}

function isTutorialToken(s: string): boolean {
  for (const tok of TUTORIAL_TOKENS) {
    if (s.includes(tok)) return true;
  }
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

describe("openspec/contributing.md path citations vs disk (pt190)", () => {
  test("every literal repo-rooted path resolves on disk OR appears in TUTORIAL_TOKENS", () => {
    expect(existsSync(DOC), "openspec/contributing.md must exist").toBe(true);

    const body = readFileSync(DOC, "utf8");
    const stripped = body.replace(/```[\s\S]*?```/g, "");

    const drifts: string[] = [];
    for (const m of stripped.matchAll(/`([^`]+)`/g)) {
      const raw = m[1]!.replace(/[,.;:)]+$/, "").trim();
      if (!looksLikePath(raw)) continue;
      if (isTutorialToken(raw)) continue;
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
        `openspec/contributing.md cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update the prose to cite an actual path on disk\n` +
          `  - If the path is a tutorial example, add the token to TUTORIAL_TOKENS in this test (and disclose example status in the doc prose)\n` +
          `  - Restore the missing file (regression?)\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
