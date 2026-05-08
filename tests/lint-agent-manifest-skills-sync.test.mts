// USMR Phase 5.5.16-pt192 — `.agents/AGENT_MANIFEST.yaml` skills
// vs `.agents/skills/` on-disk sync gate.
//
// `.agents/AGENT_MANIFEST.yaml` declares two classified skill sets:
//   - `mandatory: [...]` — skills the project requires.
//   - `not-applicable: [...]` — skills the manifest acknowledges
//     exist upstream but are out of scope for this project (e.g.
//     `ink` for terminal UI, when the project is web).
//
// Pre-pt192 the manifest listed `ink` as `not-applicable: ["ink"]`
// (justified: "terminal UI; project is web") but
// `.agents/skills/ink/SKILL.md` was installed anyway. Same drift
// class as pt167 (CLAUDE.md `slate` after slate variant removal),
// pt175 (AGENTS.md ast-grep table), pt188 (glossary.md slate).
// Different surface — manifest YAML vs filesystem state — but
// same shape: a doc claims something but the on-disk state
// contradicts.
//
// pt192 deleted `.agents/skills/ink/` to match the manifest's
// `not-applicable` declaration and locks the contract here. The
// gate enforces:
//   - Every skill in `mandatory: [...]` MUST exist as a directory
//     under `.agents/skills/<name>/`.
//   - Every skill in `not-applicable: [...]` MUST NOT exist as a
//     directory under `.agents/skills/<name>/` (uninstalled).
//
// Skills present on disk but not in either list are tolerated
// (those are "optional" by default — many openspec-* utility
// skills are installed by tooling without manifest classification).

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const MANIFEST = join(ROOT, ".agents", "AGENT_MANIFEST.yaml");
const SKILLS_DIR = join(ROOT, ".agents", "skills");

function parseList(yaml: string, key: string): string[] {
  // Find `<key>:` followed by indented `- foo` bullet lines (with
  // optional trailing comment). Stop at the next top-level key (a
  // line that starts at the same indentation as the parent).
  const re = new RegExp(`^\\s*${key}:\\s*\\n((?:\\s+- [^\\n]+\\n)+)`, "m");
  const m = yaml.match(re);
  if (!m) return [];
  const bullets = m[1]!;
  const out: string[] = [];
  for (const line of bullets.split("\n")) {
    // `  - tdd # red-green-refactor for new code`
    const bm = line.match(/^\s+-\s+(\S+)/);
    if (bm) out.push(bm[1]!);
  }
  return out;
}

describe("AGENT_MANIFEST.yaml vs .agents/skills/ on-disk (pt192)", () => {
  test("mandatory skills exist; not-applicable skills are uninstalled", () => {
    expect(existsSync(MANIFEST), ".agents/AGENT_MANIFEST.yaml must exist").toBe(
      true,
    );
    expect(existsSync(SKILLS_DIR), ".agents/skills/ must exist").toBe(true);

    const yaml = readFileSync(MANIFEST, "utf8");
    const mandatory = parseList(yaml, "mandatory");
    const notApplicable = parseList(yaml, "not-applicable");

    expect(
      mandatory.length,
      "AGENT_MANIFEST.yaml must declare a non-empty `mandatory:` skill list",
    ).toBeGreaterThan(0);

    const installed = new Set<string>();
    for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
      if (entry.isDirectory()) installed.add(entry.name);
    }

    const missingMandatory: string[] = [];
    for (const name of mandatory) {
      if (!installed.has(name)) missingMandatory.push(name);
    }

    const installedNotApplicable: string[] = [];
    for (const name of notApplicable) {
      if (installed.has(name)) installedNotApplicable.push(name);
    }

    if (missingMandatory.length || installedNotApplicable.length) {
      const lines: string[] = [];
      if (missingMandatory.length) {
        lines.push(
          `Mandatory skills missing from .agents/skills/: ${missingMandatory.join(", ")}`,
        );
      }
      if (installedNotApplicable.length) {
        lines.push(
          `Not-applicable skills still installed under .agents/skills/: ${installedNotApplicable.join(", ")}`,
        );
      }
      throw new Error(
        `Skill manifest drift:\n${lines.join("\n")}\n` +
          `Fix one of:\n` +
          `  - Install the mandatory skill (the manifest sources can re-fetch it)\n` +
          `  - Remove the not-applicable skill directory (per CLAUDE.md "if you are certain that something is unused, you can delete it completely")\n` +
          `  - Update AGENT_MANIFEST.yaml to reclassify the skill\n`,
      );
    }

    expect(missingMandatory.length).toBe(0);
    expect(installedNotApplicable.length).toBe(0);
  });
});
