// USMR Phase 5.5.16-pt255 — openspec/config.yaml In-flight changes
// block vs disk sync gate.
//
// `openspec/config.yaml` is the OpenSpec-CLI project descriptor
// consumed by `openspec list` / `openspec validate` / `openspec
// status` and read by agents for first-context bootstrap. Its
// `context:` block contains an "In-flight changes (openspec/
// changes/):" enumeration that MUST stay 1:1 with the directories
// shipping under `openspec/changes/` (excluding `archive/` and
// free-floating top-level files like `FINAL-CROSS-CUTTING-
// REVIEW.md`).
//
// pt254 found the In-flight changes block was BOTH stale and
// incomplete: two missing entries (`enhance-a11y-coverage` and
// `externalize-strings-and-add-i18n`) plus a misleading
// "merged via PR #44/#45" framing for two changes that scaffold-
// merged but didn't archive. The block had drifted N pt-iters
// since the last manual refresh. Same drift class as pt184
// (AGENTS.md Symbolic-references row vs disk) — config files that
// fall behind the live tree under `openspec/changes/`.
//
// pt255 ports the pt184 sync-gate pattern to `openspec/config.yaml`.
// The gate enforces:
//   - Every active OpenSpec change directory under
//     `openspec/changes/` (excluding `archive/` and
//     `FINAL-CROSS-CUTTING-REVIEW.md`) appears as an entry in the
//     In-flight changes block.
//   - The block contains no phantom names (entries with no
//     corresponding directory under `openspec/changes/`).
//
// The "Live capabilities" enumeration in config.yaml is sibling-
// gated by the pt184 AGENTS.md row sync; both files would fail
// concurrently if a spec drifted, so duplicate gating here would
// be redundant. config.yaml's spec list is captured but not
// strictly compared (a future iter may extend the gate; for pt255
// the change-id sync is the load-bearing assertion).

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CONFIG_YAML = join(ROOT, "openspec", "config.yaml");
const CHANGES = join(ROOT, "openspec", "changes");

function listActiveChanges(): Set<string> {
  const out = new Set<string>();
  if (!existsSync(CHANGES)) return out;
  for (const entry of readdirSync(CHANGES, { withFileTypes: true })) {
    // Only directories count as active changes. Top-level files
    // (e.g. `FINAL-CROSS-CUTTING-REVIEW.md`) are notes, not
    // proposals.
    if (!entry.isDirectory()) continue;
    if (entry.name === "archive") continue;
    out.add(entry.name);
  }
  return out;
}

function findInFlightBlock(body: string): string {
  // Locate the line `In-flight changes (openspec/changes/):` and
  // capture every following line until the next non-indented
  // section header (e.g. `Merge order:`, `Adjacent reference:`).
  // The block's lines are all indented with at least 2 spaces in
  // the YAML block-scalar.
  const lines = body.split("\n");
  const startIdx = lines.findIndex((l) =>
    l.match(/^\s*In-flight changes\s*\(openspec\/changes\/\)\s*:\s*$/),
  );
  if (startIdx === -1) {
    throw new Error(
      `openspec/config.yaml: "In-flight changes (openspec/changes/):" header not found.\nFix: keep the In-flight changes section header verbatim so the pt255 sync gate can locate it.`,
    );
  }
  const collected: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    // Stop when we hit a sibling top-level header (capital letter
    // immediately after 2 spaces, ending in `:`). This handles the
    // file's structure where each top-level subsection is `  Foo:`.
    if (/^\s{2}[A-Z][^:]*:\s*$/.test(line) && i > startIdx + 1) break;
    // Stop on a fully blank line that's followed by a non-bullet
    // sibling header.
    if (line.trim() === "") {
      // Look ahead: if the next non-empty line is a sibling
      // header, this blank ends the block.
      let j = i + 1;
      while (j < lines.length && lines[j]!.trim() === "") j++;
      if (j === lines.length) break;
      const next = lines[j]!;
      if (/^\s{2}[A-Z][^:]*:\s*$/.test(next)) break;
      // Otherwise treat the blank as in-block whitespace.
      continue;
    }
    collected.push(line);
  }
  return collected.join("\n");
}

function extractChangeIds(block: string): Set<string> {
  // Each entry starts with `  - <change-id> — ...` (kebab-case
  // change-id is the first dash-prefixed token after the bullet).
  // Some lines are continuations (no bullet); skip those.
  const out = new Set<string>();
  const re = /^\s*-\s+([a-z][a-z0-9-]+)\b/gm;
  let m;
  while ((m = re.exec(block)) !== null) {
    out.add(m[1]!);
  }
  return out;
}

describe("openspec/config.yaml In-flight changes vs disk (pt255)", () => {
  test("config.yaml exists and is a regular file", () => {
    expect(existsSync(CONFIG_YAML), "openspec/config.yaml must exist").toBe(
      true,
    );
    expect(statSync(CONFIG_YAML).isFile()).toBe(true);
  });

  test("In-flight changes block enumerates exactly the active change directories", () => {
    const body = readFileSync(CONFIG_YAML, "utf8");
    const block = findInFlightBlock(body);
    const cited = extractChangeIds(block);
    const onDisk = listActiveChanges();

    const inDocOnly = [...cited].filter((n) => !onDisk.has(n)).sort();
    const onDiskOnly = [...onDisk].filter((n) => !cited.has(n)).sort();

    if (inDocOnly.length || onDiskOnly.length) {
      const lines: string[] = [];
      if (onDiskOnly.length) {
        lines.push(
          `Active changes on disk but missing from openspec/config.yaml In-flight block: ${onDiskOnly.join(", ")}`,
        );
      }
      if (inDocOnly.length) {
        lines.push(
          `Names in openspec/config.yaml In-flight block with no openspec/changes/ directory: ${inDocOnly.join(", ")}`,
        );
      }
      throw new Error(
        `openspec/config.yaml In-flight changes drift:\n${lines.join("\n")}\nFix: keep the In-flight changes block 1:1 with directories under openspec/changes/ (excluding archive/ and free-floating *.md notes). The pt254 fix added enhance-a11y-coverage + externalize-strings-and-add-i18n; future change additions/archives must update this block too.`,
      );
    }

    expect(inDocOnly.length).toBe(0);
    expect(onDiskOnly.length).toBe(0);
  });
});
