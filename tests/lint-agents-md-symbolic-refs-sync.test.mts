// USMR Phase 5.5.16-pt184 — AGENTS.md Symbolic-references table
// vs disk sync gate.
//
// AGENTS.md (canonical multi-agent instruction file; CLAUDE.md and
// GEMINI.md symlink to it) carries a "Symbolic references" table
// at §"Symbolic references" enumerating the live OpenSpec changes,
// live capabilities, and other artifact lists. When proposals are
// authored / archived or specs are introduced / renamed, this
// table must move in lockstep — otherwise contributors and AI
// agents trust a list that lies about what's currently active.
//
// Pre-pt184 the table:
//   1. Token source row listed `--text`/`--muted`/`--border`/
//      `--bg-alt` as live aliases. pt86/pt169/pt170 pruned all 4
//      (same drift as pt176 fixed in DESIGN.md §2 prose).
//   2. Security rules row listed 7 ast-grep rule IDs but the
//      disk has 9 (same drift class as pt175 fixed in the §"Rules
//      in force" table at line 204).
//   3. OpenSpec changes (active) row was missing
//      `externalize-strings-and-add-i18n` (the proposal authored
//      during the recent ralph loop). The disk had 7 active
//      change directories; the table cited 6.
//
// Same documentation-vs-implementation drift class as pt175
// (AGENTS.md ast-grep table missing rows), pt176 (DESIGN.md
// retired-alias prose), pt178 (openspec spec `public/favicon.svg`),
// pt179 (AGENTS.md `tests/screen-reader.spec.ts` Phase-6 prose),
// pt180 (README.md `openspec/AGENTS.md` ghost path).
//
// pt184 corrected all 3 rows and locks the contract here. The
// gate enforces:
//   (a) every active OpenSpec change directory under
//       `openspec/changes/` (excluding `archive/` and free-floating
//       `*.md` notes) appears in the cited list, and the cited
//       list contains no phantom names.
//   (b) every live capability directory under `openspec/specs/`
//       appears in the cited list, and the cited list contains
//       no phantom names.
//
// The Token source row + the Security rules row are gated by
// pt175 / pt176 in their canonical locations; pt184 stops the
// duplication by pointing back at those canonical sources rather
// than maintaining a parallel inline list (drift via redundancy
// is exactly what bit pre-pt184).

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, realpathSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const AGENTS_MD = join(ROOT, "AGENTS.md");
const CHANGES = join(ROOT, "openspec", "changes");
const SPECS = join(ROOT, "openspec", "specs");

function listActiveChanges(): Set<string> {
  const out = new Set<string>();
  if (!existsSync(CHANGES)) return out;
  for (const entry of readdirSync(CHANGES, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "archive") continue;
    out.add(entry.name);
  }
  return out;
}

function listLiveSpecs(): Set<string> {
  const out = new Set<string>();
  if (!existsSync(SPECS)) return out;
  for (const entry of readdirSync(SPECS, { withFileTypes: true })) {
    if (entry.isDirectory()) out.add(entry.name);
  }
  return out;
}

function findRowCitations(body: string, labelLiteral: string): Set<string> {
  // Find the table row whose first cell starts with `labelLiteral`.
  // The third column is the "Owns" cell — matched via a non-greedy
  // capture between the second `|` and the third `|`.
  const escaped = labelLiteral.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rowRe = new RegExp(`^\\|\\s*${escaped}[^|]*\\|[^|]*\\|([^|]+)\\|`, "m");
  const m = body.match(rowRe);
  if (!m) {
    throw new Error(`Symbolic-references row not found: "${labelLiteral}"`);
  }
  const cell = m[1]!;
  const cited = new Set<string>();
  for (const token of cell.matchAll(/`([a-z][a-z0-9-]+)`/g)) {
    cited.add(token[1]!);
  }
  return cited;
}

describe("AGENTS.md Symbolic-references table vs disk (pt184)", () => {
  test("OpenSpec changes (active) row matches openspec/changes/ on disk", () => {
    expect(existsSync(AGENTS_MD), "AGENTS.md must exist").toBe(true);
    const body = readFileSync(realpathSync(AGENTS_MD), "utf8");
    const cited = findRowCitations(body, "OpenSpec changes (active)");
    const onDisk = listActiveChanges();

    const inDocOnly = [...cited].filter((n) => !onDisk.has(n)).sort();
    const onDiskOnly = [...onDisk].filter((n) => !cited.has(n)).sort();

    if (inDocOnly.length || onDiskOnly.length) {
      const lines: string[] = [];
      if (onDiskOnly.length) {
        lines.push(
          `Active changes on disk but missing from AGENTS.md row: ${onDiskOnly.join(", ")}`,
        );
      }
      if (inDocOnly.length) {
        lines.push(
          `Names in AGENTS.md row with no openspec/changes/ directory: ${inDocOnly.join(", ")}`,
        );
      }
      throw new Error(
        `Symbolic-references "OpenSpec changes (active)" row drift:\n${lines.join("\n")}\nFix: keep the row 1:1 with directories under openspec/changes/ (excluding archive/).`,
      );
    }
    expect(inDocOnly.length).toBe(0);
    expect(onDiskOnly.length).toBe(0);
  });

  test("OpenSpec specs (live capabilities) row matches openspec/specs/ on disk", () => {
    const body = readFileSync(realpathSync(AGENTS_MD), "utf8");
    const cited = findRowCitations(body, "OpenSpec specs (live capabilities)");
    const onDisk = listLiveSpecs();
    // Drop `let` / `const` non-id tokens that may appear in
    // example identifiers — the row's "Owns" cell only enumerates
    // capability names, so a strict 1:1 set comparison is correct.
    const inDocOnly = [...cited].filter((n) => !onDisk.has(n)).sort();
    const onDiskOnly = [...onDisk].filter((n) => !cited.has(n)).sort();
    if (inDocOnly.length || onDiskOnly.length) {
      const lines: string[] = [];
      if (onDiskOnly.length) {
        lines.push(
          `Live specs on disk but missing from AGENTS.md row: ${onDiskOnly.join(", ")}`,
        );
      }
      if (inDocOnly.length) {
        lines.push(
          `Names in AGENTS.md row with no openspec/specs/ directory: ${inDocOnly.join(", ")}`,
        );
      }
      throw new Error(
        `Symbolic-references "OpenSpec specs (live capabilities)" row drift:\n${lines.join("\n")}\nFix: keep the row 1:1 with directories under openspec/specs/.`,
      );
    }
    expect(inDocOnly.length).toBe(0);
    expect(onDiskOnly.length).toBe(0);
  });

  // pt217 — openspec/project.md `Live capabilities:` line
  // makes the same claim AGENTS.md's Symbolic-references row
  // does, but in a different doc surface. The OpenSpec CLI
  // consumes project.md as project-context ground truth, so
  // a stale capabilities list there misleads agents the same
  // way the AGENTS.md drift did (pre-pt184).
  test("openspec/project.md `Live capabilities:` line matches openspec/specs/ on disk", () => {
    const PROJECT_MD = AGENTS_MD.replace("AGENTS.md", "openspec/project.md");
    expect(existsSync(PROJECT_MD), "openspec/project.md must exist").toBe(true);
    const body = readFileSync(PROJECT_MD, "utf8");
    const m = body.match(/^Live capabilities:\s*([^.]+)\./m);
    if (!m) {
      throw new Error(
        "openspec/project.md must contain a `Live capabilities: ...` line under §`Capabilities (`openspec/specs/`)`",
      );
    }
    const cited = new Set<string>();
    for (const tok of m[1]!.matchAll(/`([a-z][a-z0-9-]+)`/g)) {
      cited.add(tok[1]!);
    }

    const onDisk = listLiveSpecs();
    const inDocOnly = [...cited].filter((n) => !onDisk.has(n)).sort();
    const onDiskOnly = [...onDisk].filter((n) => !cited.has(n)).sort();

    if (inDocOnly.length || onDiskOnly.length) {
      const lines: string[] = [];
      if (onDiskOnly.length) {
        lines.push(
          `Live specs on disk but missing from openspec/project.md: ${onDiskOnly.join(", ")}`,
        );
      }
      if (inDocOnly.length) {
        lines.push(
          `Names in openspec/project.md with no openspec/specs/ directory: ${inDocOnly.join(", ")}`,
        );
      }
      throw new Error(
        `openspec/project.md \`Live capabilities:\` line drift:\n${lines.join("\n")}\nFix: keep the line 1:1 with directories under openspec/specs/ (and synchronize with the AGENTS.md Symbolic-references row).`,
      );
    }
    expect(inDocOnly.length).toBe(0);
    expect(onDiskOnly.length).toBe(0);
  });
});
