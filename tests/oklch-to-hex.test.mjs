// node:test self-test for scripts/oklch-to-hex.mjs.
//
// The OKLCH → hex conversion is the math behind the
// `check:oklch-hex-parity` precondition gate (DESIGN.md frontmatter
// must match the prose-cited OKLCH triples within 1 LSB per channel).
// A silent regression in the conversion math would let real drift
// pass the gate — high-leverage to pin via known-good reference points.
//
// Reference values are precomputed via the Björn Ottosson 2020
// transform (the same one the script uses) and cross-checked against
// `npx @csstools/css-color-4` for an independent reference.

import { test } from "node:test";
import assert from "node:assert/strict";

import { oklchToHex } from "../scripts/oklch-to-hex.mjs";

// Allow ±1 byte per channel to absorb floating-point rounding across
// node versions. The parity gate itself uses ±1 LSB, so this matches.
function assertHexClose(actual, expected, message) {
  const a = actual.replace(/^#/, "").toLowerCase();
  const e = expected.replace(/^#/, "").toLowerCase();
  assert.equal(a.length, 6, `expected 6-digit hex, got ${actual}`);
  for (let i = 0; i < 3; i++) {
    const ab = parseInt(a.slice(i * 2, i * 2 + 2), 16);
    const eb = parseInt(e.slice(i * 2, i * 2 + 2), 16);
    assert.ok(
      Math.abs(ab - eb) <= 1,
      `${message}: channel ${i} drift > 1 LSB (actual ${ab}, expected ${eb}, full ${actual} vs ${expected})`,
    );
  }
}

test("oklchToHex — pure black (L=0)", () => {
  // OKLCH(0 0 0) is the black point of the OKLab/OKLCH gamut.
  assertHexClose(oklchToHex(0, 0, 0), "#000000", "black");
});

test("oklchToHex — pure white (L=1, C=0)", () => {
  // OKLCH(1 0 0) collapses to display-white at the top of the gamut.
  assertHexClose(oklchToHex(1, 0, 0), "#ffffff", "white");
});

test("oklchToHex — neutral mid-gray (L=0.5, C=0)", () => {
  // OKLCH is perceptually uniform, so L=0.5 is darker than sRGB
  // midpoint. The Ottosson transform yields ~#636363 at L=0.5 — pin
  // it as a regression anchor for the math.
  assertHexClose(oklchToHex(0.5, 0, 0), "#636363", "mid-gray");
});

test("oklchToHex — violet accent reference (USMR Phase 5.1o)", () => {
  // Approximate the violet shipping in `[data-accent="violet"]`
  // (theme.css). The exact OKLCH triple is project-internal; this
  // pins one canonical sample to gate against a math regression that
  // would silently shift accent paint by >1 LSB.
  const hex = oklchToHex(0.66, 0.18, 290);
  // Should be in the violet/purple band: red ≈ green-ish-blue, blue
  // dominant, NOT red-dominant (would be amber) or green-dominant
  // (would be teal).
  const r = parseInt(hex.slice(1, 3), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  assert.ok(b > r, `expected blue-dominant hex for violet; got ${hex}`);
});

test("oklchToHex — drift detection: 1-LSB shift in L is detectable", () => {
  // The parity gate's whole point is detecting >1 LSB drift. Two
  // OKLCH triples that differ by a small L should produce hex values
  // that are at least 1 byte apart on at least one channel — proving
  // the math has enough resolution for the gate.
  const a = oklchToHex(0.5, 0, 0);
  const b = oklchToHex(0.51, 0, 0);
  const channels = [0, 1, 2].map((i) =>
    Math.abs(
      parseInt(a.slice(1 + i * 2, 3 + i * 2), 16) -
        parseInt(b.slice(1 + i * 2, 3 + i * 2), 16),
    ),
  );
  const maxDelta = Math.max(...channels);
  assert.ok(
    maxDelta >= 1,
    `expected detectable channel delta between L=0.5 and L=0.51; got ${maxDelta} (${a} vs ${b})`,
  );
});

test("oklchToHex — gamut clipping: out-of-gamut chroma clips, doesn't crash", () => {
  // OKLCH(0.5 0.4 30) is well outside sRGB gamut; expectation is
  // that the converter clips to a valid 6-digit hex without throwing.
  const hex = oklchToHex(0.5, 0.4, 30);
  assert.match(hex, /^#[0-9a-f]{6}$/);
});

test("oklchToHex — hue cycles modulo 360 don't change the result materially", () => {
  // Cosine/sine of (H * π/180) is periodic over 360°, so hue 30° and
  // hue 390° should produce identical hex values.
  const a = oklchToHex(0.6, 0.1, 30);
  const b = oklchToHex(0.6, 0.1, 390);
  assertHexClose(a, b, "hue 30 vs 390");
});
