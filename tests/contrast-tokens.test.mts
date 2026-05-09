import { describe, expect, test } from "vitest";
import { oklchToHex } from "../scripts/oklch-to-hex.mjs";

// USMR Phase 5.5.6 — closes the phantom CI gate referenced in
// CLAUDE.md "Accessibility" section. Verifies WCAG 2.1 AA contrast for
// every canonical foreground × background token pair using the same
// OKLCH → sRGB conversion as the existing `oklch-to-hex` precondition
// gate. Runs in vitest so contrast regressions surface BEFORE the
// build (axe-core in `tests/home-axe.spec.ts` runs at Playwright time
// and only flags rendered DOM, not raw token pairs).

// WCAG AA thresholds (per spec §1.4.3 / §1.4.11):
//   Normal text:    4.5 : 1
//   Large text:     3.0 : 1
//   Non-text:       3.0 : 1

const NORMAL_TEXT_AA = 4.5;
const LARGE_TEXT_AA = 3.0;

// Canonical OKLCH triples — mirror DESIGN.md §2.1 + theme.css.
// `--fg` / `--fg-1` / `--fg-2` / `--fg-3` are foreground roles; `--bg`
// / `--bg-1` / `--bg-2` are background roles. The semantic accent /
// status colors (`--accent`, `--ok`, `--bad`, `--warn`) are tested as
// non-text contrast targets (3 : 1 against the canvas).
const TOKENS: Record<string, { L: number; C: number; H: number }> = {
  // Foreground
  "--fg": { L: 0.96, C: 0.005, H: 85 },
  "--fg-1": { L: 0.86, C: 0.008, H: 85 },
  "--fg-2": { L: 0.72, C: 0.008, H: 85 }, // Phase 5.1p.8 a11y bump
  "--fg-3": { L: 0.62, C: 0.008, H: 85 }, // Phase 5.1p.8 a11y bump

  // Background
  "--bg": { L: 0.18, C: 0.008, H: 250 },
  "--bg-1": { L: 0.22, C: 0.008, H: 250 },
  "--bg-2": { L: 0.27, C: 0.008, H: 250 },

  // Accent / status (non-text contrast targets)
  "--accent": { L: 0.86, C: 0.14, H: 185 },
  "--ok": { L: 0.78, C: 0.14, H: 155 },
  "--bad": { L: 0.7, C: 0.18, H: 25 },
  "--warn": { L: 0.82, C: 0.14, H: 65 },
};

// ---- WCAG 2.x relative luminance + contrast ratio ----
//
// Implements https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
// (sRGB → linear → weighted sum). Reuses oklch-to-hex's gamut clip.
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) throw new Error(`invalid hex: ${hex}`);
  return [
    parseInt(m[1]!, 16) / 255,
    parseInt(m[2]!, 16) / 255,
    parseInt(m[3]!, 16) / 255,
  ];
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const [bright, dark] = lumA >= lumB ? [lumA, lumB] : [lumB, lumA];
  return (bright + 0.05) / (dark + 0.05);
}

// Pre-compute hex per token using the project's conversion utility —
// stays in lockstep with `oklch-to-hex` so any drift in the conversion
// math fails this test AND `check:oklch-hex-parity` in the same diff.
const HEX = Object.fromEntries(
  Object.entries(TOKENS).map(([name, { L, C, H }]) => [
    name,
    oklchToHex(L, C, H),
  ]),
) as Record<keyof typeof TOKENS, string>;

// ----- Pairings under test -----

interface Pair {
  fg: keyof typeof TOKENS;
  bg: keyof typeof TOKENS;
  /** WCAG AA threshold to apply. */
  threshold: number;
  /** Human label for failure messages. */
  context: string;
}

// Every fg × bg combination used in the live UI. Keep this in sync
// with theme.css consumers — the contrast contract is enforced by the
// pairs we ACTUALLY render, not the cartesian product.
const NORMAL_TEXT_PAIRS: Pair[] = [
  {
    fg: "--fg",
    bg: "--bg",
    threshold: NORMAL_TEXT_AA,
    context: "body text on canvas",
  },
  {
    fg: "--fg",
    bg: "--bg-1",
    threshold: NORMAL_TEXT_AA,
    context: "card body text",
  },
  {
    fg: "--fg-1",
    bg: "--bg",
    threshold: NORMAL_TEXT_AA,
    context: "primary on canvas",
  },
  {
    fg: "--fg-1",
    bg: "--bg-1",
    threshold: NORMAL_TEXT_AA,
    context: "primary on card",
  },
  {
    fg: "--fg-2",
    bg: "--bg",
    threshold: NORMAL_TEXT_AA,
    context: "secondary on canvas",
  },
  {
    fg: "--fg-2",
    bg: "--bg-1",
    threshold: NORMAL_TEXT_AA,
    context: "secondary on card",
  },
];

const LARGE_OR_NONTEXT_PAIRS: Pair[] = [
  {
    fg: "--fg-3",
    bg: "--bg",
    threshold: LARGE_TEXT_AA,
    context: "tertiary / mono caps on canvas",
  },
  {
    fg: "--fg-3",
    bg: "--bg-1",
    threshold: LARGE_TEXT_AA,
    context: "tertiary / mono caps on card",
  },
  {
    fg: "--accent",
    bg: "--bg",
    threshold: LARGE_TEXT_AA,
    context: "accent border / highlight",
  },
  {
    fg: "--accent",
    bg: "--bg-1",
    threshold: LARGE_TEXT_AA,
    context: "accent border on card",
  },
  {
    fg: "--ok",
    bg: "--bg",
    threshold: LARGE_TEXT_AA,
    context: "permit / pass status",
  },
  {
    fg: "--bad",
    bg: "--bg",
    threshold: LARGE_TEXT_AA,
    context: "deny / fail status",
  },
  {
    fg: "--warn",
    bg: "--bg",
    threshold: LARGE_TEXT_AA,
    context: "warn / pending status",
  },
];

// ----- Tests -----

describe("WCAG AA — normal text (≥ 4.5:1)", () => {
  for (const pair of NORMAL_TEXT_PAIRS) {
    test(`${pair.fg} on ${pair.bg} — ${pair.context}`, () => {
      const fgHex = HEX[pair.fg]!;
      const bgHex = HEX[pair.bg]!;
      const ratio = contrastRatio(fgHex, bgHex);
      expect(
        ratio,
        `${pair.fg} (${fgHex}) on ${pair.bg} (${bgHex}) = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(pair.threshold);
    });
  }
});

describe("WCAG AA — large text + non-text (≥ 3:1)", () => {
  for (const pair of LARGE_OR_NONTEXT_PAIRS) {
    test(`${pair.fg} on ${pair.bg} — ${pair.context}`, () => {
      const fgHex = HEX[pair.fg]!;
      const bgHex = HEX[pair.bg]!;
      const ratio = contrastRatio(fgHex, bgHex);
      expect(
        ratio,
        `${pair.fg} (${fgHex}) on ${pair.bg} (${bgHex}) = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(pair.threshold);
    });
  }
});
