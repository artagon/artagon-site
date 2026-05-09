// USMR Phase 5.5.16-pt263 — README.md CI/CD Pipeline section vs
// `.github/workflows/` sync gate.
//
// pt262 found the README's `## CI/CD Pipeline` → `### GitHub
// Actions Workflows` section enumerated 6 workflows (deploy,
// lighthouse, link-check, agents-check, copilot-setup-steps,
// release) but `ls .github/workflows/` showed 12 — six were
// missing entirely (playwright.yml, design-md-lint.yml,
// design-md-pr-diff.yml, design-md-drift.yml,
// pr-spec-compliance.yml, spec-review-reminder.yml). The README
// was last extended when only 6 workflows existed; subsequent
// workflow additions through Phase 5.x didn't propagate to
// the README.
//
// pt262 added the 6 missing subsections by hand. pt263 adds the
// gate that would have caught the drift earlier.
//
// Sibling of:
//   - pt184 / pt255 — sync gates that compare doc lists against
//     directory listings (AGENTS.md `OpenSpec changes` row,
//     `openspec/config.yaml` In-flight block).
//   - pt178 / pt179 / pt180 / pt181 / pt190 / pt191 / pt200 /
//     pt201 / pt202 / pt203 — backticked path-citation gates
//     (different drift class: those validate that cited paths
//     RESOLVE; this gate validates that every workflow IS
//     CITED).
//
// Coverage gap closed: README's CI/CD Pipeline workflow
// enumeration vs the live `.github/workflows/` directory.
//
// Scope:
//   - Files scanned: `README.md` (single file).
//   - Reference shape:
//     `#### <Display Name> (\`<workflow>.yml\`)` — Markdown
//     subsection header that names a workflow file in
//     backticks. The gate extracts the workflow filename from
//     the backticked token in each `####` header within the
//     CI/CD Pipeline section.
//   - Validation: every `*.yml` / `*.yaml` file under
//     `.github/workflows/` MUST be cited; every cited workflow
//     MUST exist on disk.
//
// HISTORICAL_ALLOW: workflows that exist on disk but are
// intentionally undocumented in README (e.g. internal-only
// scaffolding, deprecation-pending). None today.
//
// Future workflow additions / removals fail CI before the
// drift can spread, matching pt255's protective effect for
// `openspec/config.yaml` In-flight changes.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const README = join(ROOT, "README.md");
const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");

// Workflows on disk that are intentionally NOT documented in the
// README CI/CD section. Each entry MUST tie to a documented
// rationale comment. Empty today.
const UNDOCUMENTED_ALLOW = new Set<string>([
  // pt? — example placeholder. Populate when a workflow is
  // intentionally kept out of the README (e.g. internal scaffold
  // pending deletion). Remove this comment when first used.
]);

function listWorkflowFiles(): Set<string> {
  const out = new Set<string>();
  if (!existsSync(WORKFLOWS_DIR)) return out;
  for (const e of readdirSync(WORKFLOWS_DIR, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith(".yml") && !e.name.endsWith(".yaml")) continue;
    out.add(e.name);
  }
  return out;
}

// Locate the CI/CD Pipeline section and capture every workflow
// filename cited inside a `####` subsection header. The expected
// shape is `#### Display Name (\`workflow.yml\`)` — the parser
// captures the backticked filename token after the parenthetical.
function extractCitedWorkflows(body: string): Set<string> {
  // Find the `## CI/CD Pipeline` header and capture every line
  // until the next `## ` (or end-of-file).
  const startRe = /^##\s+CI\/CD\s+Pipeline\s*$/m;
  const start = body.search(startRe);
  if (start === -1) {
    throw new Error(
      `README.md: "## CI/CD Pipeline" header not found. The pt263 gate locates the section by this verbatim header — keep it stable.`,
    );
  }
  const after = body.slice(start);
  const nextSectionMatch = after.slice(2).search(/^##\s+\S/m); // skip our own '##'
  const sectionEnd =
    nextSectionMatch === -1 ? after.length : nextSectionMatch + 2;
  const section = after.slice(0, sectionEnd);

  // Capture every `#### Display Name (\`<filename>.<yml|yaml>\`)`
  // pattern. Tolerant of extra whitespace and varying display
  // text. The filename MUST end in .yml or .yaml.
  const out = new Set<string>();
  const subRe = /^####\s+[^(]+\(\s*`([^`]+\.ya?ml)`\s*\)/gm;
  let m;
  while ((m = subRe.exec(section)) !== null) {
    out.add(m[1]!);
  }
  return out;
}

describe("README CI/CD section vs .github/workflows/ (pt263)", () => {
  test(".github/workflows/ exists and is a directory", () => {
    expect(existsSync(WORKFLOWS_DIR), ".github/workflows/ must exist").toBe(
      true,
    );
    expect(statSync(WORKFLOWS_DIR).isDirectory()).toBe(true);
  });

  test("every workflow on disk is cited in README CI/CD section, and vice versa", () => {
    expect(existsSync(README), "README.md must exist").toBe(true);
    const body = readFileSync(README, "utf8");
    const cited = extractCitedWorkflows(body);
    const onDisk = listWorkflowFiles();

    const inDocOnly = [...cited].filter((n) => !onDisk.has(n)).sort();
    const onDiskOnly = [...onDisk]
      .filter((n) => !cited.has(n))
      .filter((n) => !UNDOCUMENTED_ALLOW.has(n))
      .sort();

    if (inDocOnly.length || onDiskOnly.length) {
      const lines: string[] = [];
      if (onDiskOnly.length) {
        lines.push(
          `Workflows on disk but missing from README CI/CD section: ${onDiskOnly.join(", ")}`,
        );
      }
      if (inDocOnly.length) {
        lines.push(
          `Workflow filenames in README CI/CD section with no .github/workflows/ file: ${inDocOnly.join(", ")}`,
        );
      }
      throw new Error(
        `README.md CI/CD Pipeline workflow drift:\n${lines.join("\n")}\nFix:\n  - Add a \`#### Display Name (\\\`<filename>.yml\\\`)\` subsection for each new workflow under "## CI/CD Pipeline"\n  - Remove README subsections that cite a deleted workflow\n  - If a workflow is intentionally undocumented (e.g. internal scaffold), add it to UNDOCUMENTED_ALLOW with a documented rationale comment`,
      );
    }

    expect(inDocOnly.length).toBe(0);
    expect(onDiskOnly.length).toBe(0);
  });
});
