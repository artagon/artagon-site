// USMR Phase 5.5.16-pt179 + pt238 — AGENTS.md path-citation gate.
//
// AGENTS.md is the canonical project instruction file (CLAUDE.md and
// GEMINI.md symlink to it — every agent loads from the same source).
// When the prose cites a literal repo-rooted path inside backticks
// (`src/...`, `tests/...`, `scripts/...`, `public/...`, `.github/...`,
// `docs/...`, `openspec/...`, `rules/...`, `new-design/...`,
// `.claude/...`, `.agents/...`), the path MUST exist on disk.
// Otherwise contributors (and other agents) chase references to
// files that were renamed, removed, or never authored.
//
// pt179 (the original gate) only matched bare-rooted path prefixes
// like `openspec/...`. pt238 extended the gate to also recognize
// the `@/`-prefix alias (`@/openspec/AGENTS.md`) used by the
// OpenSpec-style "always open" instruction blocks. The gap was
// exposed when AGENTS.md cited `@/openspec/AGENTS.md` — a file
// that was deleted in commit f1cc5df when its content migrated
// into the per-skill `opsx:*` scaffolds — and the path-citation
// gate didn't catch the broken reference because it only saw
// `@/openspec/...` (which doesn't match the bare `openspec/`
// prefix). pt238's fix: rewrote the AGENTS.md OpenSpec block
// to point at live files (`openspec/project.md`,
// `openspec/contributing.md`, `.agents/skills/`) and extended
// this gate to strip a leading `@/` before disk-resolution.
//
// Pre-pt179 line 374's accessibility bullet cited
// `tests/screen-reader.spec.ts (Phase 6) drives Tab-navigation` —
// but the file doesn't exist; the test is Phase 6 of the
// `enhance-a11y-coverage` proposal. Same documentation-vs-
// implementation drift class as pt178 (openspec spec path
// citations), pt177 / pt176 (DESIGN.md prose-vs-cascade), pt175
// (AGENTS.md ast-grep table sync).
//
// pt179 reworded line 374 to qualify the test as planned-not-shipped
// (same fix shape as pt177's `.num-h2` qualification). This gate
// locks the contract for all backticked path citations in AGENTS.md.
//
// Sibling of the pt178 openspec-spec gate. Centered on AGENTS.md
// because it's the multi-agent instruction surface — when its
// citations rot, every agent loading the project lies to itself.

import { describe, expect, test } from "vitest";
import {
  readFileSync,
  existsSync,
  realpathSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const AGENTS_MD = join(ROOT, "AGENTS.md");

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

// HISTORICAL allow-list — paths cited in pt-archaeology contexts where
// the doc explicitly explains the migration. Each entry MUST tie to a
// specific documented narrative; the gate's failure-mode hint says
// removing the entry requires also rewriting the surrounding prose.
//
// Stripping the `@/` prefix on cited paths normalizes both
// `@/openspec/AGENTS.md` and bare `openspec/AGENTS.md` to the same
// disk-resolution check (the pt238 finding was that the bare gate
// only handled the latter shape).
const HISTORICAL_ALLOW = new Set<string>([
  // pt238 — the OpenSpec workflow guide at `openspec/AGENTS.md` was
  // deleted when its content migrated into per-skill `opsx:*`
  // scaffolds. The pt238 fix-prose explains the migration explicitly
  // and cites the deleted path inside backticks for archaeology.
  "openspec/AGENTS.md",
]);

function stripAtPrefix(s: string): string {
  return s.startsWith("@/") ? s.slice(2) : s;
}

function looksLikePath(s: string): boolean {
  const normalized = stripAtPrefix(s);
  return PATH_PREFIXES.some((p) => normalized.startsWith(p));
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

describe("AGENTS.md path citations vs disk (pt179)", () => {
  test("every literal repo-rooted path in AGENTS.md prose resolves on disk", () => {
    expect(existsSync(AGENTS_MD), "AGENTS.md must exist").toBe(true);
    // Resolve symlinks so the gate checks the canonical file even
    // if AGENTS.md is invoked via CLAUDE.md / GEMINI.md.
    const real = realpathSync(AGENTS_MD);
    const body = readFileSync(real, "utf8");

    // Strip code fences — illustrative snippets aren't a contract.
    const stripped = body.replace(/```[\s\S]*?```/g, "");

    const drifts: string[] = [];
    for (const m of stripped.matchAll(/`([^`]+)`/g)) {
      const raw = m[1]!.replace(/[,.;:)]+$/, "").trim();
      if (!looksLikePath(raw)) continue;
      // Skip brace-expansion alternations — they document a pattern.
      if (/[{}]/.test(raw)) continue;
      // Strip line-number suffix and the `@/` alias prefix (pt238).
      const cleaned = stripAtPrefix(raw.split(":")[0]!);
      if (HISTORICAL_ALLOW.has(cleaned)) continue;
      // Recursive globs (`tests/**/*.spec.ts`) document discovery
      // patterns (Playwright/vitest test-match contracts), not
      // literal files. The pattern itself is the load-bearing
      // citation — validating it would require re-implementing the
      // runner's glob matcher.
      if (cleaned.includes("**")) continue;
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
        `AGENTS.md cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update AGENTS.md to cite the actual path on disk\n` +
          `  - If the path is forthcoming, qualify the citation as planned (same shape as pt177's \`.num-h2\` qualification)\n` +
          `  - Restore the missing file (regression?)\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
