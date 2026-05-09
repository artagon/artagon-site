// USMR Phase 5.5.16-pt285 — openspec/specs/<id>/spec.md Purpose
// section vs TBD-placeholder gate.
//
// pt278 found a TBD-placeholder Purpose section in
// openspec/specs/site-content/spec.md:
//
//   ## Purpose
//   TBD - created by archiving change refactor-content-collections.
//   Update Purpose after archive.
//
// A broader scan in pt279 revealed the drift was systemic — 7 of
// 9 live capability specs (~78%) shipped with TBD-placeholder
// Purpose sections that survived their respective archive events
// for months. The pt278→pt284 backfill arc (7 iters) closed every
// TBD placeholder with a substantive 5-part Purpose section
// (governs / surface / operationalization / archaeology /
// incoming-modifications).
//
// pt285 ships the structural gate that prevents recurrence: any
// new capability spec scaffolded into `openspec/specs/<id>/spec.md`
// MUST have a non-TBD Purpose section before it can land in the
// repo.
//
// Sibling of:
//   - pt175 / pt178 / pt179 / pt180 / pt181 / pt190 / pt191 /
//     pt200 / pt201 / pt202 / pt203 — backticked path-citation
//     gates (different drift class: those validate that cited
//     paths RESOLVE; this gate validates that Purpose has
//     substantive content).
//   - pt184 / pt255 / pt263 / pt267 — sync gates that compare
//     doc lists against disk-derived references.
//   - pt258 — source-comment archive-path drift gate.
//
// Coverage gap closed: openspec/specs/<id>/spec.md Purpose
// section content (no other gate enforces that Purpose is
// non-TBD).
//
// Scope:
//   - Files scanned: every `openspec/specs/<id>/spec.md` (one
//     per live capability).
//   - Reference shape: locate `## Purpose` header, capture the
//     prose that follows until the next `## ` heading.
//   - Validation: the captured prose MUST NOT match the
//     `^\s*TBD\b` pattern (case-sensitive — "TBD" is the
//     OpenSpec scaffolding placeholder marker, not a generic
//     "tbd" to-do note).
//
// HISTORICAL_ALLOW: capability spec IDs that intentionally
// retain a TBD Purpose. None today; reserved for future cases
// where a spec is genuinely pre-content (e.g. a freshly-archived
// change with no time to author Purpose; would be a brief grace
// period, not a long-lived state).

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SPECS = join(ROOT, "openspec", "specs");

// Spec IDs whose Purpose may legitimately remain TBD. Empty
// today. Each future entry MUST tie to a documented rationale
// comment + a tracking issue / proposal that will resolve the
// TBD within a bounded grace period.
const HISTORICAL_TBD_ALLOW = new Set<string>([
  // Example shape (intentionally unused; populate when a
  // freshly-archived change needs a brief grace period to
  // author its Purpose).
]);

interface SpecPurposeFinding {
  /** Spec id (directory name under openspec/specs/). */
  readonly id: string;
  /** First non-empty line of the Purpose body. */
  readonly firstLine: string;
}

function listSpecIds(): string[] {
  if (!existsSync(SPECS)) return [];
  return readdirSync(SPECS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function readSpecPurpose(id: string): string {
  const file = join(SPECS, id, "spec.md");
  if (!existsSync(file)) {
    throw new Error(
      `openspec/specs/${id}/spec.md not found — directory exists but spec.md is absent.`,
    );
  }
  const body = readFileSync(file, "utf8");
  // Locate `## Purpose` header line.
  const purposeRe = /^##\s+Purpose\s*$/m;
  const match = body.match(purposeRe);
  if (!match) {
    throw new Error(
      `openspec/specs/${id}/spec.md is missing a "## Purpose" section. The pt285 gate requires every capability spec to declare its Purpose explicitly.`,
    );
  }
  const startIdx = match.index! + match[0].length;
  // Capture prose until the next `## ` heading or end-of-file.
  const after = body.slice(startIdx);
  const nextHeaderMatch = after.match(/^##\s+\S/m);
  const endIdx = nextHeaderMatch ? nextHeaderMatch.index! : after.length;
  return after.slice(0, endIdx).trim();
}

function firstNonEmptyLine(text: string): string {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return "";
}

describe("openspec/specs/<id>/spec.md Purpose vs TBD placeholder (pt285)", () => {
  test("openspec/specs/ tree exists with ≥1 capability", () => {
    expect(existsSync(SPECS), "openspec/specs/ must exist").toBe(true);
    expect(statSync(SPECS).isDirectory()).toBe(true);
    const ids = listSpecIds();
    expect(ids.length, "must enumerate ≥1 capability spec").toBeGreaterThan(0);
  });

  test("every Purpose section is non-TBD-placeholder", () => {
    const ids = listSpecIds();

    const drifts: SpecPurposeFinding[] = [];
    for (const id of ids) {
      if (HISTORICAL_TBD_ALLOW.has(id)) continue;

      let purpose: string;
      try {
        purpose = readSpecPurpose(id);
      } catch (err) {
        // Surface as a drift so the test failure shows the
        // structural problem (missing Purpose header / missing
        // spec.md file).
        drifts.push({
          id,
          firstLine: `<error: ${(err as Error).message}>`,
        });
        continue;
      }

      const firstLine = firstNonEmptyLine(purpose);
      if (/^TBD\b/.test(firstLine)) {
        drifts.push({ id, firstLine });
      }
    }

    if (drifts.length > 0) {
      const lines = drifts.map(
        (d) => `  - openspec/specs/${d.id}/spec.md: "${d.firstLine}"`,
      );
      throw new Error(
        `openspec/specs/<id>/spec.md Purpose drift: ${drifts.length} spec(s) have TBD-placeholder Purpose:\n${lines.join("\n")}\n\n` +
          `Fix:\n` +
          `  - Backfill the Purpose section with substantive content describing what the capability governs (use the pt278-pt284 5-part structure: governs / implementation surface / operationalization / archaeology / incoming-modifications).\n` +
          `  - If the spec is in a brief grace period after archive (no time yet to author), add the spec id to HISTORICAL_TBD_ALLOW with a documented rationale comment + tracking issue.\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
