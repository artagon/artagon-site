// USMR Phase 5.5.16-pt205 — `.github/ISSUE_TEMPLATE/*.yml` path-citation gate.
//
// `.github/ISSUE_TEMPLATE/*.yml` files render as the GitHub
// "New issue" form. When the prose cites a literal repo-rooted
// path inside backticks, the path MUST exist on disk —
// otherwise contributors filing new issues see references to
// non-existent files / docs.
//
// Pre-pt205 `.github/ISSUE_TEMPLATE/spec.yml:13` cited
// `openspec/AGENTS.md` as the workflow-rules reference. The
// file does not exist; canonical workflow guide is the root
// `AGENTS.md` (CLAUDE.md / GEMINI.md symlink to it). This is
// the FOURTH ghost-path occurrence pt-fixed:
//   - pt180: README.md cited the same path 3×
//   - pt181: docs/CONTRIBUTING.md cited it 1×
//   - pt191: COPILOT.md / .github/copilot-{instructions,
//     review-instructions}.md cited it 4×
//   - pt205: .github/ISSUE_TEMPLATE/spec.yml cites it 1×
// Total: 9 references across 6 files corrected by the cumulative
// pt180/181/191/205 set, plus pt184 fixed the AGENTS.md
// Symbolic-references row that hid the same drift in a different
// surface.
//
// Same documentation-vs-implementation drift class as the
// 9-gate doc-citation set (pt178/179/180/181/190/191/200/201/
// 202/203). Different surface (issue-template form vs prose
// docs) but same shape.
//
// pt205 corrected the spec.yml citation and locks the contract
// here. Sibling of the now-10-gate doc-citation set extending
// coverage to GitHub issue templates.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TPL_DIR = join(ROOT, ".github", "ISSUE_TEMPLATE");

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

describe(".github/ISSUE_TEMPLATE/*.yml path citations vs disk (pt205)", () => {
  test("every literal repo-rooted path in any issue template resolves on disk", () => {
    expect(existsSync(TPL_DIR), ".github/ISSUE_TEMPLATE/ must exist").toBe(
      true,
    );

    const templates = readdirSync(TPL_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.(yml|yaml)$/.test(e.name))
      .map((e) => e.name);

    expect(
      templates.length,
      "expected at least one issue template under .github/ISSUE_TEMPLATE/",
    ).toBeGreaterThan(0);

    const drifts: string[] = [];

    for (const tpl of templates) {
      const body = readFileSync(join(TPL_DIR, tpl), "utf8");
      const stripped = body.replace(/```[\s\S]*?```/g, "");

      for (const m of stripped.matchAll(/`([^`]+)`/g)) {
        const raw = m[1]!.replace(/[,.;:)]+$/, "").trim();
        if (!looksLikePath(raw)) continue;
        if (/<[^>]+>/.test(raw)) continue;
        if (raw.includes("YYYY-MM-DD")) continue;
        if (/[{}]/.test(raw)) continue;
        if (raw.includes("**")) continue;
        const cleaned = raw.split(":")[0]!;
        if (/[*?\[]/.test(cleaned)) {
          if (!resolveWildcard(cleaned)) drifts.push(`${tpl}: ${cleaned}`);
          continue;
        }
        if (!existsSync(join(ROOT, cleaned))) {
          drifts.push(`${tpl}: ${cleaned}`);
        }
      }
    }

    if (drifts.length > 0) {
      throw new Error(
        `.github/ISSUE_TEMPLATE/*.yml cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update the template to cite the actual path on disk\n` +
          `  - Restore the missing file (regression?)\n` +
          `  - If the path was removed, drop the template reference\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
