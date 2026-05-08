/**
 * Tweaks state — pure logic tests.
 *
 * Run via:
 *   node --test tests/tweaks-state.test.mts
 *
 * Node 22+ ships type-stripping by default; no transpiler needed.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  ACCENT_SWATCH,
  ACCENTS,
  DEFAULTS,
  DENSITIES,
  HERO_FONTS,
  THEMES,
  isAccent,
  isDensity,
  isHeroFont,
  isTheme,
  parse,
  type Accent,
  type Density,
  type HeroFont,
  type Theme,
  type Tweaks,
} from "../src/scripts/tweaks-state.ts";

describe("parseTweaks", () => {
  it("returns DEFAULTS when input is null", () => {
    assert.deepEqual(parse(null), DEFAULTS);
  });

  it("returns DEFAULTS when input is undefined", () => {
    assert.deepEqual(parse(undefined), DEFAULTS);
  });

  it("returns DEFAULTS when input is a string", () => {
    assert.deepEqual(parse("garbage"), DEFAULTS);
  });

  it("returns DEFAULTS when input is a number", () => {
    assert.deepEqual(parse(42), DEFAULTS);
  });

  it("returns DEFAULTS when input is an empty object", () => {
    assert.deepEqual(parse({}), DEFAULTS);
  });

  it("preserves valid accent value", () => {
    assert.equal(parse({ accent: "violet" }).accent, "violet");
  });

  it("falls back accent to default when invalid", () => {
    assert.equal(parse({ accent: "fuchsia" }).accent, DEFAULTS.accent);
  });

  it("falls back accent when not a string", () => {
    assert.equal(parse({ accent: 42 }).accent, DEFAULTS.accent);
  });

  it("preserves valid density value", () => {
    assert.equal(parse({ density: "dense" }).density, "dense");
    assert.equal(parse({ density: "roomy" }).density, "roomy");
  });

  it("falls back density when invalid", () => {
    assert.equal(parse({ density: "tight" }).density, DEFAULTS.density);
  });

  it("preserves valid theme value", () => {
    assert.equal(parse({ theme: "light" }).theme, "light");
  });

  it("falls back theme when invalid", () => {
    assert.equal(parse({ theme: "midnight" }).theme, DEFAULTS.theme);
  });

  it("preserves valid heroFont value", () => {
    for (const f of HERO_FONTS) {
      assert.equal(parse({ heroFont: f }).heroFont, f);
    }
  });

  it("falls back heroFont when invalid", () => {
    assert.equal(parse({ heroFont: "comic-sans" }).heroFont, DEFAULTS.heroFont);
  });

  it("preserves boolean showGrid", () => {
    assert.equal(parse({ showGrid: true }).showGrid, true);
    assert.equal(parse({ showGrid: false }).showGrid, false);
  });

  it("falls back showGrid when not a boolean", () => {
    assert.equal(parse({ showGrid: "true" }).showGrid, DEFAULTS.showGrid);
    assert.equal(parse({ showGrid: 1 }).showGrid, DEFAULTS.showGrid);
    assert.equal(parse({ showGrid: null }).showGrid, DEFAULTS.showGrid);
  });

  it("preserves all valid fields together", () => {
    const input: Tweaks = {
      accent: "lime",
      density: "roomy",
      theme: "light",
      heroFont: "fraunces",
      showGrid: false,
      writingWidget: "C · split",
    };
    assert.deepEqual(parse(input), input);
  });

  it("falls back invalid fields independently", () => {
    const result = parse({
      accent: "lime",
      density: "wrong",
      theme: "dark",
      heroFont: "wrong",
      showGrid: true,
    });
    assert.equal(result.accent, "lime");
    assert.equal(result.density, DEFAULTS.density);
    assert.equal(result.theme, "dark");
    assert.equal(result.heroFont, DEFAULTS.heroFont);
    assert.equal(result.showGrid, true);
  });

  it("ignores unknown extra keys", () => {
    const result = parse({
      accent: "cyan",
      __proto__: { malicious: true },
      extra: "ignored",
    });
    assert.equal(result.accent, "cyan");
    assert.equal((result as Record<string, unknown>).extra, undefined);
    assert.equal((result as Record<string, unknown>).malicious, undefined);
  });
});

describe("type guards", () => {
  it("isAccent accepts each canonical value and rejects others", () => {
    for (const a of ACCENTS) assert.ok(isAccent(a));
    assert.equal(isAccent("teal"), false);
    assert.equal(isAccent(""), false);
    assert.equal(isAccent(null), false);
    assert.equal(isAccent(undefined), false);
    assert.equal(isAccent(123), false);
  });

  it("isDensity accepts each canonical value and rejects others", () => {
    for (const d of DENSITIES) assert.ok(isDensity(d));
    assert.equal(isDensity("tight"), false);
    assert.equal(isDensity(null), false);
  });

  it("isTheme accepts only dark/light", () => {
    for (const t of THEMES) assert.ok(isTheme(t));
    assert.equal(isTheme("midnight"), false);
    assert.equal(isTheme("auto"), false);
  });

  it("isHeroFont accepts each canonical value and rejects others", () => {
    for (const f of HERO_FONTS) assert.ok(isHeroFont(f));
    assert.equal(isHeroFont("inter"), false);
    assert.equal(isHeroFont("system"), false);
  });
});

describe("ACCENT_SWATCH", () => {
  it("has an OKLCH value for every accent", () => {
    for (const a of ACCENTS) {
      assert.ok(
        ACCENT_SWATCH[a].startsWith("oklch("),
        `${a} swatch should be an OKLCH color`,
      );
    }
  });

  it("has exactly one entry per accent (no extras)", () => {
    assert.equal(Object.keys(ACCENT_SWATCH).length, ACCENTS.length);
  });
});

describe("DEFAULTS shape", () => {
  it("DEFAULTS pass all type guards (round-trip)", () => {
    const round = parse(DEFAULTS);
    assert.deepEqual(round, DEFAULTS);
  });

  it("DEFAULTS values are members of their canonical sets", () => {
    assert.ok(isAccent(DEFAULTS.accent));
    assert.ok(isDensity(DEFAULTS.density));
    assert.ok(isTheme(DEFAULTS.theme));
    assert.ok(isHeroFont(DEFAULTS.heroFont));
    assert.equal(typeof DEFAULTS.showGrid, "boolean");
    assert.equal(typeof DEFAULTS.writingWidget, "string");
  });
});

// Compile-time assertions — these will fail tsc if the imported types drift.
const _typeCheckAccent: Accent = "cyan";
const _typeCheckDensity: Density = "comfortable";
const _typeCheckTheme: Theme = "dark";
const _typeCheckHeroFont: HeroFont = "grotesk";
void _typeCheckAccent;
void _typeCheckDensity;
void _typeCheckTheme;
void _typeCheckHeroFont;
