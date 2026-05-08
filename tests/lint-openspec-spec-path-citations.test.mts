// USMR Phase 5.5.16-pt178 — openspec/specs/**/spec.md path-citation gate.
//
// Live specs under `openspec/specs/` describe shipped capabilities.
// When a spec cites a literal file path inside backticks (e.g.
// `public/favicon.ico`, `src/lib/charset.ts`, `tests/foo.spec.ts`,
// `scripts/sync-build-config.mjs`), the path MUST exist on disk —
// otherwise the spec is lying about what the capability ships.
//
// Pre-pt178 `openspec/specs/build-config/spec.md` line 36 cited
// `public/favicon.svg` (the disk only has `public/favicon.ico`)
// and `public/icon-*.png` (the actual location is
// `public/icons/icon-*.png`). The same scenario sentence ("public
// deliverables stay outside .build") was load-bearing for the
// build-config capability — the wrong paths broke its precondition
// without anyone noticing because the spec text isn't tested.
//
// Same documentation-vs-implementation drift class as pt176 / pt177
// (DESIGN.md prose-vs-cascade), pt175 (AGENTS.md table-vs-disk),
// pt167 (CLAUDE.md slate after slate removal).
//
// This gate parses every backticked path-shaped citation in every
// `openspec/specs/**/spec.md` and asserts each literal path
// resolves to a real file or directory. Wildcards (`*`, `?`,
// `[...]`) are flattened by walking the parent directory and
// asserting at least ONE match exists; brace alternations
// (`{good,bad}.md`) and explicit globs are allow-listed because
// they document a pattern, not a literal file.

import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SPECS_DIR = join(ROOT, "openspec", "specs");

function* walkSpecs(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkSpecs(p);
    else if (entry.name === "spec.md") yield p;
  }
}

// Roots whose backticked occurrences in spec prose are interpreted
// as committed file paths under the repo. Anything outside this
// set is treated as identifier text (e.g. `astro.config.ts` could
// be a doc reference vs a file reference; restrict to project-rooted
// paths so the gate is tight).
const PATH_ROOTS = ["src/", "tests/", "scripts/", "public/"];

function looksLikePath(s: string): boolean {
  return PATH_ROOTS.some((r) => s.startsWith(r));
}

function resolveWildcard(literal: string): boolean {
  // `public/icons/icon-*.png` → walk `public/icons/` and assert at
  // least one entry matches the wildcard pattern translated to a
  // RegExp.
  const dir = join(ROOT, dirname(literal));
  const pattern = basename(literal);
  if (!existsSync(dir)) return false;
  const stat = statSync(dir);
  if (!stat.isDirectory()) return false;
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

describe("openspec/specs/**/spec.md path citations vs disk (pt178)", () => {
  test("every literal `src|tests|scripts|public/...` citation in spec prose resolves on disk", () => {
    expect(existsSync(SPECS_DIR), "openspec/specs/ must exist").toBe(true);

    const specs = [...walkSpecs(SPECS_DIR)];
    expect(specs.length, "expected at least one live spec").toBeGreaterThan(0);

    const drifts: { spec: string; path: string }[] = [];

    for (const spec of specs) {
      const body = readFileSync(spec, "utf8");
      const stripped = body.replace(/```[\s\S]*?```/g, "");

      for (const m of stripped.matchAll(/`([^`]+)`/g)) {
        const raw = m[1]!;
        // Strip any trailing punctuation that grew into the match.
        const cleaned = raw.replace(/[,.;:)]+$/, "").trim();
        if (!looksLikePath(cleaned)) continue;
        // Skip brace-expansion alternations — they document a
        // pattern, not a literal file.
        if (/[{}]/.test(cleaned)) continue;
        // Strip line-number suffix (`file.ts:42`).
        const path = cleaned.split(":")[0]!;
        // Wildcards: defer to readdir-based matching.
        if (/[*?\[]/.test(path)) {
          if (!resolveWildcard(path)) {
            drifts.push({
              spec: spec.replace(ROOT, ""),
              path,
            });
          }
          continue;
        }
        if (!existsSync(join(ROOT, path))) {
          drifts.push({
            spec: spec.replace(ROOT, ""),
            path,
          });
        }
      }
    }

    if (drifts.length > 0) {
      const lines = drifts.map((d) => `  - ${d.spec}  →  ${d.path}`).join("\n");
      throw new Error(
        `openspec/specs/ cite ${drifts.length} path(s) that do not exist on disk:\n${lines}\n\nFix one of:\n` +
          `  - Update the spec to cite the actual path on disk\n` +
          `  - Restore the missing file (regression?)\n` +
          `  - If the path is illustrative pseudo-syntax, refactor the prose to remove the implication that it's a real file\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
