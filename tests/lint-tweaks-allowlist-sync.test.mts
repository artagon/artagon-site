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
// Inline scripts keep literal arrays to preserve synchronous execution.
// USMR 14.13 also checks BOTH production BaseLayout allow-lists against
// the single typed THEMES tuple and exercises divergent negative controls.
// The dual-sourcing creates a drift risk: if a
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

function assertProductionThemeSync(state: string, boot: string, layout: string): void {
  const canonical = extractInlineArray(state, "THEMES");
  const dev = extractInlineArray(boot, "themes");
  const production = [...layout.matchAll(/\bvar\s+ALLOWED\s*=\s*\[([^\]]*)\]/g)]
    .map(match => extractInlineArray(`const themes = [${match[1]}]`, "themes"));
  if (!canonical?.length || !dev?.length || production.length !== 2 ||
      [dev, ...production].some(values => JSON.stringify(values) !== JSON.stringify(canonical))) {
    throw new Error("Tweaks THEMES must match both production theme allow-lists in BaseLayout.astro");
  }
  // USMR 14.13 R2: both inline fallbacks and the SSR attribute share the tuple default.
  const defaults = [...layout.matchAll(/\bDEF\s*=\s*(['"])([^'"]*)\1/g)]
    .map(match => match[2]);
  const rendered = layout.match(/<html\b[^>]*\bdata-theme=["']([^"']*)["']/)?.[1];
  if (defaults.length !== 2 || defaults.some(value => value !== canonical[0]) || rendered !== canonical[0]) {
    throw new Error("BaseLayout production theme defaults must match THEMES[0]");
  }
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
  const baseLayout = readFileSync(join(ROOT, "src", "layouts", "BaseLayout.astro"), "utf8");

  test("THEMES, the Tweaks boot script, and both production allow-lists agree (USMR 14.13)", () => {
    assertProductionThemeSync(tweaksState, tweaksAstro, baseLayout);
  });

  test("negative control: reverting BOTH Tweaks copies to dark/light fails against production", () => {
    const divergedState = tweaksState.replace(/(const THEMES\s*=\s*)\[[^\]]*\]/, '$1["dark", "light"]');
    const divergedBoot = tweaksAstro.replace(/(const themes\s*=\s*)\[[^\]]*\]/, '$1["dark", "light"]');
    expect(divergedState).not.toBe(tweaksState);
    expect(divergedBoot).not.toBe(tweaksAstro);
    expect(() => assertProductionThemeSync(divergedState, divergedBoot, baseLayout))
      .toThrow("production theme allow-lists");
  });

  test.each([0, 1])("negative control: production allow-list %s cannot diverge", (index) => {
    let current = 0;
    const diverged = baseLayout.replace(/\bvar\s+ALLOWED\s*=\s*\[[^\]]*\]/g, declaration =>
      current++ === index ? "var ALLOWED = ['dark', 'light']" : declaration);
    expect(diverged).not.toBe(baseLayout);
    expect(() => assertProductionThemeSync(tweaksState, tweaksAstro, diverged))
      .toThrow("production theme allow-lists");
  });

  test.each([0, 1])("negative control: inline DEF %s cannot diverge from THEMES[0]", index => {
    let current = 0;
    const diverged = baseLayout.replace(/\bDEF\s*=\s*(['"])[^'"]*\1/g, declaration =>
      current++ === index ? "DEF='midnight'" : declaration);
    expect(diverged).not.toBe(baseLayout);
    expect(() => assertProductionThemeSync(tweaksState, tweaksAstro, diverged))
      .toThrow("production theme defaults");
  });

  test("negative control: server-rendered theme cannot diverge from THEMES[0]", () => {
    const diverged = baseLayout.replace(/(<html\b[^>]*\bdata-theme=)["'][^"']*["']/, '$1"midnight"');
    expect(diverged).not.toBe(baseLayout);
    expect(() => assertProductionThemeSync(tweaksState, tweaksAstro, diverged))
      .toThrow("production theme defaults");
  });

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
