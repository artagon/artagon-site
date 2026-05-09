// USMR Phase 5.5.16-pt165 — Tweaks pre-paint allow-list sync.
//
// Tweaks state has 5 enums (accent, density, theme, hero-font,
// writing-widget) that are dual-sourced:
//
//   1. `src/scripts/tweaks-state.ts` — canonical TypeScript
//      constants (ACCENTS, DENSITIES, THEMES, HERO_FONTS,
//      WRITING_WIDGETS). Imported by TweaksPanel.tsx for the
//      runtime React island.
//
//   2. `src/components/Tweaks.astro` — inline `is:inline` pre-
//      paint script that runs synchronously before React hydrates.
//      Can't import from tweaks-state.ts (TypeScript module is
//      not a runtime dependency available in the pre-paint
//      context); has to duplicate the allow-lists as inline
//      JS arrays.
//
// The dual-sourcing is unavoidable but creates a drift risk: if a
// contributor adds a new value to tweaks-state.ts (e.g. a fifth
// hero-font), they have to remember to also update Tweaks.astro's
// inline list. If they forget, the pre-paint silently drops the
// new value before React hydrates — users see a flash of the
// default state, then the new value applies after hydrate.
//
// This gate asserts the two lists match for all 5 enums.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// Extract a JS array literal from inline source. Looks for the
// pattern `const NAME = ["a", "b", "c"];` and returns the parsed
// values. Returns null if not found.
function extractInlineArray(source: string, varName: string): string[] | null {
  // Match `[export] const NAME[: Type] = [...]` patterns. The TS
  // canonical form is `export const HERO_FONTS: ReadonlyArray
  // <HeroFont> = [...]`; the inline-script form is just `const
  // accents = [...]`. The optional `:` segment captures both.
  // The character class `[^\]]` matches any char except `]`,
  // including newlines.
  const re = new RegExp(
    `const\\s+${varName}\\s*(?::\\s*[^=]+)?=\\s*\\[([^\\]]+)\\]`,
  );
  const m = source.match(re);
  if (!m) return null;
  // Parse the entries — split on commas, trim, strip surrounding
  // quotes. Empty entries (trailing comma) filtered out.
  return m[1]!
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

describe("Tweaks pre-paint allow-list sync (pt165)", () => {
  const tweaksAstro = readFileSync(
    join(ROOT, "src", "components", "Tweaks.astro"),
    "utf8",
  );
  const tweaksState = readFileSync(
    join(ROOT, "src", "scripts", "tweaks-state.ts"),
    "utf8",
  );

  // The 5 enums — pre-paint variable name -> canonical TS const.
  const enums: ReadonlyArray<{
    inlineName: string;
    canonicalName: string;
  }> = [
    { inlineName: "accents", canonicalName: "ACCENTS" },
    { inlineName: "densities", canonicalName: "DENSITIES" },
    { inlineName: "themes", canonicalName: "THEMES" },
    { inlineName: "fonts", canonicalName: "HERO_FONTS" },
    { inlineName: "widgets", canonicalName: "WRITING_WIDGETS" },
  ];

  for (const e of enums) {
    test(`${e.inlineName} (Tweaks.astro) === ${e.canonicalName} (tweaks-state.ts)`, () => {
      const inline = extractInlineArray(tweaksAstro, e.inlineName);
      const canonical = extractInlineArray(tweaksState, e.canonicalName);
      expect(
        inline,
        `Tweaks.astro must declare const ${e.inlineName}`,
      ).not.toBeNull();
      expect(
        canonical,
        `tweaks-state.ts must export const ${e.canonicalName}`,
      ).not.toBeNull();
      // Order MUST also match — the React island renders option
      // chips in TS-canonical order; the pre-paint applies the
      // same allow-list. Mismatched order is a UX regression class
      // (different chip-label order before/after hydration).
      expect(
        inline,
        `${e.inlineName} (pre-paint) must match ${e.canonicalName} (canonical) — drift risk per pt165`,
      ).toEqual(canonical);
    });
  }
});
