// USMR Phase 5.5.16-pt175 — ast-grep rules-table doc-vs-disk sync gate.
//
// AGENTS.md (the canonical instruction file; CLAUDE.md / GEMINI.md
// are symlinks to it) carries a "Rules in force" table that lists
// every active ast-grep YAML rule under `rules/security/`. The
// table tells contributors which patterns trigger which severity.
//
// Pre-pt175 the table listed 7 rules but the disk had 9 (active +
// scanning during `npm run lint:sg`): the `no-raw-color-literal`
// and `no-untraceable-token` rules — both warnings shipped during
// USMR Phase 2 / `adopt-design-md-format` Phase 6.3 — were never
// added to the doc. Same documentation-vs-implementation drift
// class as pt167 (CLAUDE.md mentioning "midnight|twilight|slate"
// when slate had already been removed) and pt163-pt168 (dead
// schema fields TS-typed but not implemented).
//
// pt175 added the 2 missing rows. This gate locks the contract:
// every YAML rule under `rules/security/` MUST appear in the
// AGENTS.md table; every table row MUST have a corresponding
// YAML file. Same dual-source-sync pattern as pt165 (Tweaks
// pre-paint), pt171 (orphan tokens), pt172 (security.txt).

import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const AGENTS_MD = join(ROOT, "AGENTS.md");
const RULES_DIR = join(ROOT, "rules", "security");

describe("ast-grep rules-table doc-vs-disk sync (pt175)", () => {
  test("AGENTS.md `Rules in force` table matches rules/security/*.yml on disk", () => {
    expect(existsSync(AGENTS_MD), "AGENTS.md must exist").toBe(true);
    expect(existsSync(RULES_DIR), "rules/security/ must exist").toBe(true);

    // Disk: every .yml file's `id:` field. Strip the `.yml` suffix
    // so the comparison key is the rule ID itself.
    const onDisk = new Set<string>();
    for (const entry of readdirSync(RULES_DIR)) {
      if (!entry.endsWith(".yml")) continue;
      const body = readFileSync(join(RULES_DIR, entry), "utf8");
      const idMatch = body.match(/^id:\s*([a-z][a-z0-9-]+)\s*$/m);
      expect(
        idMatch,
        `rules/security/${entry} must declare an \`id:\` field`,
      ).not.toBeNull();
      onDisk.add(idMatch![1]!);
    }

    // Doc: every backticked rule ID inside the "Rules in force"
    // table. The table starts at the `### Rules in force` heading
    // and ends at the next heading (`### When to run`).
    const agents = readFileSync(AGENTS_MD, "utf8");
    const tableMatch = agents.match(
      /### Rules in force\s+([\s\S]*?)(?=\n### )/,
    );
    expect(
      tableMatch,
      "AGENTS.md must contain a `### Rules in force` section followed by another `###` heading",
    ).not.toBeNull();
    const tableBody = tableMatch![1]!;

    const inDoc = new Set<string>();
    for (const m of tableBody.matchAll(/`([a-z][a-z0-9-]+)`/g)) {
      // Filter to rule-id-shaped tokens only (kebab-case starting
      // with `no-`). The table has other backticked tokens
      // (`Math.random()`, `console.log`, etc.) that aren't rule
      // IDs; the `no-` prefix is the project's convention for
      // every security rule.
      const tok = m[1]!;
      if (tok.startsWith("no-")) inDoc.add(tok);
    }

    // Bidirectional set comparison: disk-only OR doc-only is drift.
    const inDocOnly = [...inDoc].filter((r) => !onDisk.has(r)).sort();
    const onDiskOnly = [...onDisk].filter((r) => !inDoc.has(r)).sort();

    if (inDocOnly.length > 0 || onDiskOnly.length > 0) {
      const lines: string[] = [];
      if (onDiskOnly.length > 0) {
        lines.push(
          `Rules on disk but missing from AGENTS.md table: ${onDiskOnly.join(", ")}`,
        );
      }
      if (inDocOnly.length > 0) {
        lines.push(
          `Rules in AGENTS.md table but no YAML file on disk: ${inDocOnly.join(", ")}`,
        );
      }
      throw new Error(
        `ast-grep rules doc-vs-disk drift:\n${lines.join("\n")}\nFix: keep AGENTS.md \`Rules in force\` table 1:1 with rules/security/*.yml.`,
      );
    }

    expect(onDiskOnly.length).toBe(0);
    expect(inDocOnly.length).toBe(0);
  });
});
