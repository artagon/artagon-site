// USMR Phase 5.5.16-pt201 — `docs/guides/new-design-conversion.md`
// path-citation gate.
//
// `docs/guides/new-design-conversion.md` is a contributor-facing
// guide for converting components from the new-design extraction
// to live Astro components. When the prose cites a literal repo-
// rooted path inside backticks, the path MUST exist on disk.
//
// Pre-pt201 the file had 3 drifts:
//   1. line 33 prescribed `public/fonts/` as the self-host font
//      target — but the canonical path per
//      `self-host-woff2-fonts/specs/font-self-hosting/` is
//      `public/assets/fonts/` (the `assets/` infix is load-bearing
//      for the deploy-host `_headers` cache rules).
//   2. line 165 cited `public/assets/roadmap.css` (4.27KB) in the
//      "CSS budgets" section — but pt-history shows that file was
//      absorbed into `src/components/RoadmapTimeline.astro` scoped
//      styles during the 5.7 redesign and no longer exists.
//   3. line 271 cited `src/scripts/tweaks.ts` as an example
//      "custom element" pattern reference — but the file doesn't
//      exist; the live custom-element pattern is at
//      `src/components/Tweaks.astro`. The line ALSO correctly
//      mentioned `src/scripts/tweaks-state.ts` (which exists), so
//      the fix is a swap of the first ref to the right file.
//
// Same documentation-vs-implementation drift class as pt178-181
// (path-citation gates), pt190 (openspec/contributing.md tutorial),
// pt191 (Copilot trio), pt200 (build-artifacts.md). Each `docs/`
// guide we add a per-file gate for closes a contributor onboarding
// surface that could otherwise rot.
//
// Sibling of the now-7-gate doc-citation set (pt178/179/180/181/
// 190/191/200) extending coverage to the new-design-conversion
// guide.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DOC = join(ROOT, "docs", "guides", "new-design-conversion.md");

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

describe("docs/guides/new-design-conversion.md path citations vs disk (pt201)", () => {
  test("every literal repo-rooted path resolves on disk", () => {
    expect(
      existsSync(DOC),
      "docs/guides/new-design-conversion.md must exist",
    ).toBe(true);

    const body = readFileSync(DOC, "utf8");
    const stripped = body.replace(/```[\s\S]*?```/g, "");

    // ASPIRATIONAL: paths cited as the canonical target of an
    // in-flight OpenSpec proposal that hasn't shipped yet. Each
    // entry MUST tie back to a specific proposal source-of-truth
    // so the allow-list itself can't rot.
    const ASPIRATIONAL = new Set<string>([
      // Per `self-host-woff2-fonts/specs/font-self-hosting/spec.md`
      // — canonical WOFF2 target dir; lands when the proposal
      // applies its tasks.md. The `assets/` infix is load-bearing
      // for deploy-host `_headers` cache rules.
      "public/assets/fonts/",
    ]);
    // HISTORICAL: paths cited as pre-USMR baseline state with
    // explicit transition narration. The doc explains what
    // happened to the file; removing the citation would erase
    // load-bearing CSS-budget archaeology.
    const HISTORICAL = new Set<string>([
      // pre-USMR /roadmap CSS bundle — absorbed into
      // `src/components/RoadmapTimeline.astro` scoped styles
      // during the 5.7 redesign. Line 165 narrates the
      // transition explicitly.
      "public/assets/roadmap.css",
    ]);

    const drifts: string[] = [];
    for (const m of stripped.matchAll(/`([^`]+)`/g)) {
      const raw = m[1]!.replace(/[,.;:)]+$/, "").trim();
      if (!looksLikePath(raw)) continue;
      if (/<[^>]+>/.test(raw)) continue;
      if (raw.includes("YYYY-MM-DD")) continue;
      if (/[{}]/.test(raw)) continue;
      if (raw.includes("**")) continue;
      const cleaned = raw.split(":")[0]!;
      if (ASPIRATIONAL.has(cleaned) || HISTORICAL.has(cleaned)) continue;
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
        `docs/guides/new-design-conversion.md cites ${drifts.length} path(s) that do not exist on disk:\n` +
          drifts.map((d) => `  - ${d}`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Update the prose to cite the actual path on disk\n` +
          `  - For never-shipped artifacts (planned but not authored), drop the reference or qualify it explicitly\n` +
          `  - For pre-USMR paths absorbed into component-scoped styles, narrate the transition\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
