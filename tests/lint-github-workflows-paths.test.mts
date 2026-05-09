// USMR Phase 5.5.16-pt206 — `.github/workflows/*.yml` path-citation gate.
//
// `.github/workflows/*.yml` files are CI workflow definitions
// rendered by GitHub Actions. When prose / comments cite a
// literal repo-rooted path inside backticks, the path MUST exist
// on disk OR appear in a HISTORICAL allow-list documenting the
// transition.
//
// Pre-pt206 `.github/workflows/pr-spec-compliance.yml` cited
// `.github/workflows/spec-compliance.yml` twice in pt5.5.10
// rename-narrative comments:
//   - lines 6-7: "the workflow appeared as the file path
//     `.github/workflows/spec-compliance.yml` instead of the
//     `name:` field"
//   - line 24: "the .github/workflows/spec-compliance.yml
//     registry — file-path appears as workflow `name`"
//
// Both references are correctly past-tense — they explain WHY
// the file was renamed from `spec-compliance.yml` to
// `pr-spec-compliance.yml` (forced GitHub Actions to re-register
// the workflow after a registry corruption). The legacy filename
// only appears in this rename-explanation context.
//
// Removing the citations would erase load-bearing migration
// archaeology — contributors investigating phantom-push-event
// build failures need this context to understand the workaround.
// HISTORICAL allow-list with explicit rationale is the right
// shape (same convention as pt176 `--space-12`, pt177 `.menu`/
// `.menu-btn`, pt201 `public/assets/roadmap.css`, pt203
// `src/content/config.ts`).
//
// pt206 locks the contract here. Extends the doc-citation set
// to `.github/workflows/*.yml`. Sibling of the now-11-gate set
// (pt178/179/180/181/190/191/200/201/202/203/205).

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const WORKFLOWS = join(ROOT, ".github", "workflows");

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

describe(".github/workflows/*.yml path citations vs disk (pt206)", () => {
  test("every literal repo-rooted path in any workflow file resolves on disk OR is HISTORICAL", () => {
    expect(existsSync(WORKFLOWS), ".github/workflows/ must exist").toBe(true);

    // HISTORICAL allow-list — paths cited in transition-narrative
    // comments where the file explicitly explains the rename /
    // migration. Each entry MUST tie to a documented rationale.
    const HISTORICAL = new Set<string>([
      // pt5.5.10 rename narrative: `.github/workflows/spec-
      // compliance.yml` was renamed to `pr-spec-compliance.yml`
      // to force GitHub Actions to re-register the workflow
      // after registry corruption (file path appeared as the
      // workflow name in `gh workflow list`, every push to PR
      // branch triggered a phantom 0-job conclusion=failure run).
      // The legacy path appears ONLY in pr-spec-compliance.yml's
      // header comment + line-24 narrative comment. Removing
      // erases the WHY behind the rename.
      ".github/workflows/spec-compliance.yml",
    ]);

    const workflows = readdirSync(WORKFLOWS, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.(yml|yaml)$/.test(e.name))
      .map((e) => e.name);

    expect(
      workflows.length,
      "expected at least one .github/workflows/*.yml file",
    ).toBeGreaterThan(0);

    const drifts: string[] = [];

    for (const wf of workflows) {
      const body = readFileSync(join(WORKFLOWS, wf), "utf8");
      const stripped = body.replace(/```[\s\S]*?```/g, "");

      for (const m of stripped.matchAll(/`([^`]+)`/g)) {
        // Workflow comments wrap long lines with `# ` prefixes;
        // a backticked path can span multiple lines like:
        //   `.github/workflows/spec-
        //   # compliance.yml`
        // Normalize the captured token by collapsing embedded
        // `\n# ` (line-wrap with comment prefix) and pure newlines.
        const raw = m[1]!
          .replace(/\n\s*#\s*/g, "")
          .replace(/\n\s*/g, "")
          .replace(/[,.;:)]+$/, "")
          .trim();
        if (!looksLikePath(raw)) continue;
        if (/<[^>]+>/.test(raw)) continue;
        if (raw.includes("YYYY-MM-DD")) continue;
        if (/[{}]/.test(raw)) continue;
        if (raw.includes("**")) continue;
        const cleaned = raw.split(":")[0]!;
        if (HISTORICAL.has(cleaned)) continue;
        if (/[*?\[]/.test(cleaned)) {
          if (!resolveWildcard(cleaned)) drifts.push(`${wf}: ${cleaned}`);
          continue;
        }
        if (!existsSync(join(ROOT, cleaned))) {
          drifts.push(`${wf}: ${cleaned}`);
        }
      }
    }

    if (drifts.length > 0) {
      throw new Error(
        `.github/workflows/*.yml cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update the workflow to cite the actual path on disk\n` +
          `  - For genuine rename / migration archaeology, add the path to HISTORICAL allow-list with rationale\n` +
          `  - If the file was removed, drop the workflow reference\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
