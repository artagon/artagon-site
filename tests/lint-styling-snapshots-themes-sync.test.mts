// USMR Phase 5.5.16-pt207 — `tests/styling-snapshots.spec.ts`
// THEMES array vs `public/assets/theme.css` `data-theme` blocks
// sync gate.
//
// `tests/styling-snapshots.spec.ts:39` iterates a fixed `THEMES`
// const array, calls `document.documentElement.setAttribute(
// "data-theme", t)` for each, and captures a baseline PNG per
// (theme × viewport × surface) combination. When a theme is
// added/removed in `public/assets/theme.css`, the THEMES array
// MUST move in lockstep.
//
// Pre-pt207 the array was `["midnight", "twilight", "slate"]`
// — but pt167 removed the `slate` theme variant from
// `theme.css`. Iterating slate generated 15 orphan baseline
// PNGs that fall through to the unstyled default cascade
// (since no `:root[data-theme="slate"]` block exists). The
// PNGs aren't committed (gitignored host-specific artifacts
// per CLAUDE.md), but the spec source code itself was drift.
//
// Same documentation-vs-implementation drift class as pt167
// (CLAUDE.md `slate` after slate removal), pt188 (`.agents/
// context/glossary.md` Theme System slate after pt167), pt176
// (DESIGN.md retired-alias prose). This is the FOURTH surface
// where pt167's slate-removal drift was caught — every code/
// doc location iterating the legacy 3-theme set has now been
// updated to the canonical 2-theme set (midnight + twilight)
// or 3-theme set (dark + midnight + twilight) per the surface's
// scope.
//
// pt207 dropped slate from the THEMES array, deleted the 15
// orphan local PNGs, and locks the contract here.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SPEC = join(ROOT, "tests", "styling-snapshots.spec.ts");
const THEME_CSS = join(ROOT, "public", "assets", "theme.css");

describe("styling-snapshots THEMES vs theme.css (pt207)", () => {
  test("THEMES array entries each correspond to a live :root[data-theme=...] block", () => {
    expect(existsSync(SPEC), "tests/styling-snapshots.spec.ts must exist").toBe(
      true,
    );
    expect(existsSync(THEME_CSS), "public/assets/theme.css must exist").toBe(
      true,
    );

    // Parse THEMES from the spec.
    const specBody = readFileSync(SPEC, "utf8");
    const m = specBody.match(/const\s+THEMES\s*=\s*\[([^\]]+)\]\s*as\s+const/);
    if (!m) {
      throw new Error(
        "styling-snapshots.spec.ts must declare `const THEMES = [...] as const`",
      );
    }
    const themes = [...m[1]!.matchAll(/["']([a-z][a-z0-9-]*)["']/g)].map(
      (mm) => mm[1]!,
    );
    expect(themes.length, "THEMES array empty").toBeGreaterThan(0);

    // Parse live theme blocks from theme.css (comment-stripped).
    const cssBody = readFileSync(THEME_CSS, "utf8");
    const cssNoComments = cssBody.replace(/\/\*[\s\S]*?\*\//g, "");
    const live = new Set<string>();
    for (const mm of cssNoComments.matchAll(
      /^\s*:root\[data-theme="([a-z][a-z0-9-]*)"\]\s*\{/gm,
    )) {
      live.add(mm[1]!);
    }
    expect(
      live.size,
      "expected at least one :root[data-theme=...] block in theme.css",
    ).toBeGreaterThan(0);

    // Subset check: every THEMES entry MUST have a live block.
    // (The reverse is NOT required — the spec is allowed to
    // exclude some live themes from snapshot scope, e.g. `dark`
    // is the canonical default that midnight/twilight inherit
    // from at the cascade level; including it would duplicate
    // baselines.)
    const orphans = themes.filter((t) => !live.has(t));

    if (orphans.length > 0) {
      throw new Error(
        `${orphans.length} THEMES entry/entries have no live :root[data-theme="..."] block in theme.css:\n` +
          orphans.map((t) => `  - "${t}"`).join("\n") +
          `\n\nFix one of:\n` +
          `  - Drop the orphan theme from the THEMES array (and delete any local *-${orphans[0]}-*-darwin.png orphan baselines)\n` +
          `  - Add the theme block back to theme.css if it was removed prematurely\n`,
      );
    }
    expect(orphans.length).toBe(0);
  });
});
