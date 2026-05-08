// Tweaks panel parse-logic tests.
// Run via: node --test tests/tweaks-parse.test.mjs
// Uses Node 22.6+ type stripping to import .ts directly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, DEFAULTS } from "../src/scripts/tweaks-state.ts";

test("parse returns DEFAULTS for null", () => {
  assert.deepEqual(parse(null), DEFAULTS);
});

test("parse returns DEFAULTS for undefined", () => {
  assert.deepEqual(parse(undefined), DEFAULTS);
});

test("parse returns DEFAULTS for non-object input", () => {
  assert.deepEqual(parse("not an object"), DEFAULTS);
  assert.deepEqual(parse(42), DEFAULTS);
  assert.deepEqual(parse(true), DEFAULTS);
});

test("parse accepts a valid full Tweaks object", () => {
  const input = {
    accent: "violet",
    density: "dense",
    theme: "light",
    heroFont: "fraunces",
    showGrid: false,
    writingWidget: "A · strip",
  };
  assert.deepEqual(parse(input), input);
});

test("parse falls back per-field for invalid values", () => {
  const input = {
    accent: "neon-pink", // invalid
    density: "ultra-roomy", // invalid
    theme: "dark", // valid
    heroFont: 42, // wrong type
    showGrid: "yes", // wrong type
    writingWidget: "Z · phantom", // invalid
  };
  assert.deepEqual(parse(input), {
    accent: DEFAULTS.accent,
    density: DEFAULTS.density,
    theme: "dark",
    heroFont: DEFAULTS.heroFont,
    showGrid: DEFAULTS.showGrid,
    writingWidget: DEFAULTS.writingWidget,
  });
});

test("parse fills missing fields from DEFAULTS", () => {
  assert.deepEqual(parse({}), DEFAULTS);
  assert.deepEqual(parse({ accent: "lime" }), {
    ...DEFAULTS,
    accent: "lime",
  });
});

test("parse rejects prototype pollution attempts", () => {
  // Object.freeze prevents downstream mutations.
  const result = parse({ __proto__: { polluted: true } });
  assert.equal(/** @type {any} */ (result).polluted, undefined);
});

test("parse accepts every valid accent", () => {
  for (const accent of ["cyan", "violet", "amber", "lime"]) {
    assert.equal(parse({ accent }).accent, accent);
  }
});

test("parse accepts every valid density", () => {
  for (const density of ["dense", "comfortable", "roomy"]) {
    assert.equal(parse({ density }).density, density);
  }
});

test("parse accepts every valid theme", () => {
  for (const theme of ["dark", "light"]) {
    assert.equal(parse({ theme }).theme, theme);
  }
});

test("parse accepts every valid heroFont", () => {
  for (const heroFont of ["grotesk", "fraunces", "dmserif", "mono"]) {
    assert.equal(parse({ heroFont }).heroFont, heroFont);
  }
});

test("parse handles boolean showGrid both ways", () => {
  assert.equal(parse({ showGrid: true }).showGrid, true);
  assert.equal(parse({ showGrid: false }).showGrid, false);
});
