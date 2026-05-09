// USMR Phase 5.5.16-pt202 — `docs/guides/styling-guide.md` path-citation gate.
//
// `docs/guides/styling-guide.md` is the post-archive distilled
// record of the decisions taken in
// `openspec/changes/archive/2026-05-04-refactor-styling-architecture/`.
// Pre-pt202 it had 4 drifts:
//   1. line 5 framed itself as "draft planning material for the
//      `refactor-styling-architecture` change" — but the change
//      archived 2026-05-04. The framing was 4 days stale at
//      pt202 time.
//   2. line 822: "Token Inventory: See `openspec/changes/
//      refactor-styling-architecture/token-inventory.md`" —
//      pre-archive path; should redirect to the archived
//      location.
//   3. line 823: same archive-redirect issue for `decisions.md`.
//   4. line 824: same archive-redirect issue for `tasks.md`.
//   5. line 758 cited `src/styles/page-name.css` — but
//      `page-name` is a placeholder (the table column says
//      "Page-specific style" with `.page-name` as the CSS
//      class convention). The literal path doesn't exist; only
//      `src/styles/vision.css` is the real example. pt202
//      changed `page-name` → `<page-name>` (placeholder syntax)
//      so the gate's standard `<...>` skip catches it.
//
// Same documentation-vs-implementation drift class as pt200
// (build-artifacts.md cited pre-archive paths) and pt201
// (new-design-conversion.md placeholder + ASPIRATIONAL drift).
//
// Sibling of the now-8-gate doc-citation set (pt178/179/180/
// 181/190/191/200/201) extending coverage to the styling guide.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DOC = join(ROOT, "docs", "guides", "styling-guide.md");

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

describe("docs/guides/styling-guide.md path citations vs disk (pt202)", () => {
  test("every literal repo-rooted path resolves on disk", () => {
    expect(existsSync(DOC), "docs/guides/styling-guide.md must exist").toBe(
      true,
    );

    const body = readFileSync(DOC, "utf8");
    const stripped = body.replace(/```[\s\S]*?```/g, "");

    const drifts: string[] = [];
    for (const m of stripped.matchAll(/`([^`]+)`/g)) {
      const raw = m[1]!.replace(/[,.;:)]+$/, "").trim();
      if (!looksLikePath(raw)) continue;
      // Skip placeholder paths.
      if (/<[^>]+>/.test(raw)) continue;
      if (raw.includes("YYYY-MM-DD")) continue;
      // Skip brace-expansion alternations and recursive globs.
      if (/[{}]/.test(raw)) continue;
      if (raw.includes("**")) continue;
      const cleaned = raw.split(":")[0]!;
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
        `docs/guides/styling-guide.md cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update the prose to cite the actual path on disk\n` +
          `  - For an archived OpenSpec proposal, redirect to openspec/changes/archive/<date>-<id>/\n` +
          `  - For a placeholder example (e.g. page-name in a convention table), use angle-bracket syntax (\`<page-name>.css\`)\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
