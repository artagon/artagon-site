// USMR Phase 5.5.16-pt191 — Copilot-instruction docs path-citation gate.
//
// `COPILOT.md`, `.github/copilot-instructions.md`, and
// `.github/copilot-review-instructions.md` are the three
// surfaces GitHub Copilot loads when working in this repository.
// When their prose cites a literal repo-rooted path inside
// backticks, the path MUST exist on disk — otherwise Copilot
// (and any agent that follows the same files) chases references
// to non-existent guides.
//
// Pre-pt191 all three files cited `openspec/AGENTS.md` (4
// references total) as the canonical OpenSpec agent guide. The
// file does not exist; the canonical guide is the root
// `AGENTS.md` with `CLAUDE.md` and `GEMINI.md` symlinking to it
// (per `ls -la AGENTS.md CLAUDE.md GEMINI.md`).
//
// Same documentation-vs-implementation drift class as pt180
// (README.md cited the same ghost path 3× plus 2 stale logo
// docs), pt181 (CONTRIBUTING.md same ghost path), pt184
// (AGENTS.md Symbolic-references table). The drift survived
// pt180/pt181 by hiding in the `.github/` and root surfaces
// neither of those gates covered.
//
// pt191 redirected all 4 references to root `AGENTS.md` and
// locks the contract here. Sibling of pt178 (openspec specs),
// pt179 (AGENTS.md), pt180 (README.md), pt181 (CONTRIBUTING.md),
// pt190 (openspec/contributing.md). Together this 6-gate set
// covers every contributor / agent landing surface that
// documents project paths in present-tense prose.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SURFACES = [
  "COPILOT.md",
  ".github/copilot-instructions.md",
  ".github/copilot-review-instructions.md",
];

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

describe("Copilot-instruction docs path citations vs disk (pt191)", () => {
  for (const rel of SURFACES) {
    test(`${rel}: every literal repo-rooted path resolves on disk`, () => {
      const abs = join(ROOT, rel);
      expect(existsSync(abs), `${rel} must exist`).toBe(true);

      const body = readFileSync(abs, "utf8");
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
          `${rel} cites ${drifts.length} path(s) that do not exist on disk:\n` +
            drifts.map((d) => `  - ${d}`).join("\n") +
            `\n\nFix one of:\n` +
            `  - Update the prose to cite an actual path on disk\n` +
            `  - Restore the missing file (regression?)\n` +
            `  - If the path was removed, drop the reference too\n`,
        );
      }

      expect(drifts.length).toBe(0);
    });
  }
});
