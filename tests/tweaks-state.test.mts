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
    assert.equal(parse({ accent: "blue" }).accent, "blue");
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
    assert.deepEqual(THEMES, ["twilight", "midnight"]);
    for (const theme of THEMES) assert.equal(parse({ theme }).theme, theme);
  });

  it("falls back theme when invalid", () => {
    assert.equal(parse({ theme: "auto" }).theme, DEFAULTS.theme);
  });

  it("uses the tuple default for legacy themes when no page theme is supplied (USMR 14.13)", () => {
    for (const theme of ["dark", "light"]) {
      assert.equal(parse({ theme, accent: "lime" }).theme, "twilight");
      assert.equal(parse({ theme, accent: "lime" }).accent, "lime");
    }
  });

  it("preserves a supplied production midnight fallback for missing, legacy, or invalid themes", () => {
    for (const raw of [undefined, null, "bad", {}, { theme: "dark" }, { theme: "light" }, { theme: "solar" }, { theme: 42 }]) {
      assert.equal(parse(raw, "midnight").theme, "midnight");
    }
    assert.equal(parse({ theme: "light", accent: "lime" }, "midnight").accent, "lime");
  });

  it("a valid stored Tweaks theme wins over the supplied page fallback", () => {
    assert.equal(parse({ theme: "twilight" }, "midnight").theme, "twilight");
    assert.equal(parse({ theme: "midnight" }, "twilight").theme, "midnight");
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
      theme: "midnight",
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
      theme: "twilight",
      heroFont: "wrong",
      showGrid: true,
    });
    assert.equal(result.accent, "lime");
    assert.equal(result.density, DEFAULTS.density);
    assert.equal(result.theme, "twilight");
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
    assert.equal("extra" in result, false);
    assert.equal("malicious" in result, false);
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

  it("isTheme accepts only twilight/midnight", () => {
    for (const t of THEMES) assert.ok(isTheme(t));
    assert.equal(isTheme("dark"), false);
    assert.equal(isTheme("light"), false);
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
  it("uses the production theme default", () => {
    assert.equal(DEFAULTS.theme, "twilight");
  });
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
const _typeCheckTheme: Theme = "twilight";
const _typeCheckHeroFont: HeroFont = "grotesk";
void _typeCheckAccent;
void _typeCheckDensity;
void _typeCheckTheme;
void _typeCheckHeroFont;
