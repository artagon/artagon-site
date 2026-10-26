import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
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

// USMR site-g3f: read production values, including staging aliases and
// theme overrides, so changing midnight CSS can actually fail this gate.
const CSS = readFileSync(
  new URL("../public/assets/theme.css", import.meta.url),
  "utf8",
);
const THEMES = ["twilight", "midnight"] as const;
type Theme = (typeof THEMES)[number];
const COLOR_TOKENS = [
  "--fg",
  "--fg-1",
  "--fg-2",
  "--fg-3",
  "--bg",
  "--bg-1",
  "--bg-2",
  "--accent",
  "--accent-ink",
  "--ok",
  "--bad",
  "--warn",
] as const;
type ColorToken = (typeof COLOR_TOKENS)[number];
type Palette = Record<ColorToken, string>;

interface CssRule {
  selector: string;
  body: string;
  ancestors: string[];
  offset: number;
}

// USMR site-g3f R1/R2: retain block ancestry so layers and media queries
// stay distinct. Quoted braces and semicolons are declaration content.
function cssRules(css: string): CssRule[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack: { selector: string; offset: number }[] = [];
  const rules: CssRule[] = [];
  let start = 0;
  let quote = "";
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (char === "\\") index++;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "{") {
      stack.push({
        selector: source.slice(start, index).trim(),
        offset: index + 1,
      });
      start = index + 1;
    } else if (char === "}") {
      const block = stack.pop();
      if (!block) throw new Error("Unexpected CSS closing brace");
      rules.push({
        ...block,
        body: source.slice(block.offset, index),
        ancestors: stack.map((parent) => parent.selector),
      });
      start = index + 1;
    } else if (char === ";") start = index + 1;
  }
  if (stack.length || quote) throw new Error("Unclosed CSS block or string");
  return rules.sort((a, b) => a.offset - b.offset);
}

const THEME_SELECTOR = /^:root\[data-theme=(?:"[^"]+"|'[^']+'|[\w-]+)\]$/;

function declarationsIn(block: string): Record<string, string> {
  return Object.fromEntries(
    Array.from(block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g), (match) => [
      match[1]!,
      match[2]!.trim(),
    ]),
  );
}

function themeHex(css: string, theme: Theme): Palette {
  const source = cssRules(css)
    .filter(
      (rule) => !rule.ancestors.some((parent) => /^@media\b/.test(parent)),
    )
    .filter(
      (rule) =>
        rule.selector === ":root" ||
        THEME_SELECTOR.test(rule.selector) ||
        rule.selector === '[data-accent="cyan"]',
    )
    .map((rule) => `${rule.selector}{${rule.body}}`)
    .join("\n");
  const themeBlocks = Array.from(
    source.matchAll(
      new RegExp(
        `:root\\[data-theme=["']?${theme}["']?\\]\\s*\\{([^{}]*)\\}`,
        "g",
      ),
    ),
  );
  const cyanBlocks = Array.from(
    source.matchAll(/\[data-accent="cyan"\]\s*\{([^{}]*)\}/g),
  );
  if (!themeBlocks.length || !cyanBlocks.length)
    throw new Error(`Missing production palette: ${theme}`);
  // USMR site-g3f R2: collect every bare root outside @media, even after
  // theme selectors, and merge every matching theme block in source order.
  // The reader covers the production palette; browser checks verify cascade.
  const blocks = [
    ...Array.from(
      source.matchAll(/:root\s*\{([^{}]*)\}/g),
      (match) => match[1]!,
    ),
    ...cyanBlocks.map((match) => match[1]!),
    ...themeBlocks.map((match) => match[1]!),
  ];
  const declarations = Object.assign(
    {},
    ...blocks.map(declarationsIn),
  ) as Record<string, string>;
  function resolve(name: string, seen = new Set<string>()): string {
    if (seen.has(name)) throw new Error(`Cyclic token alias: ${name}`);
    seen.add(name);
    const value = declarations[name];
    if (!value) throw new Error(`Missing color token: ${name}`);
    const alias = value.match(/^var\((--[\w-]+)\)$/);
    if (alias) return resolve(alias[1]!, seen);
    const triple = value.match(/^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/);
    if (!triple) throw new Error(`Unsupported color token: ${name} = ${value}`);
    return oklchToHex(Number(triple[1]), Number(triple[2]), Number(triple[3]));
  }
  return Object.fromEntries(
    COLOR_TOKENS.map((name) => [name, resolve(name)]),
  ) as Palette;
}

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

// ----- Pairings under test -----

interface Pair {
  fg: ColorToken;
  bg: ColorToken;
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
    fg: "--accent-ink",
    bg: "--accent",
    threshold: NORMAL_TEXT_AA,
    context: "button text on accent",
  },
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

// USMR site-g3f: retain the default policy for decorative --line borders:
// they were not 3:1 contrast targets, so neither theme adds that pairing.
function assertContrast(pair: Pair, hex: Palette): void {
  const fgHex = hex[pair.fg];
  const bgHex = hex[pair.bg];
  const ratio = contrastRatio(fgHex, bgHex);
  expect(
    ratio,
    `${pair.fg} (${fgHex}) on ${pair.bg} (${bgHex}) = ${ratio.toFixed(2)}:1`,
  ).toBeGreaterThanOrEqual(pair.threshold);
}

describe.each(THEMES)("%s WCAG AA", (theme) => {
  const hex = themeHex(CSS, theme);
  for (const pair of [...NORMAL_TEXT_PAIRS, ...LARGE_OR_NONTEXT_PAIRS]) {
    test(`${pair.fg} on ${pair.bg} — ${pair.context}`, () => {
      assertContrast(pair, hex);
    });
  }
});

// USMR site-g3f R2: corrupt each pair in a separate later midnight block.
// All real assertions above must reject the resulting 1:1 contrast.
test.each([...NORMAL_TEXT_PAIRS, ...LARGE_OR_NONTEXT_PAIRS])(
  "negative control: midnight $fg on $bg rejects a CSS regression",
  (pair) => {
    const brokenCss = `${CSS}\n:root[data-theme="midnight"] { ${pair.bg}: var(${pair.fg}); }`;
    const hex = themeHex(brokenCss, "midnight");
    expect(() => assertContrast(pair, hex)).toThrow(/= 1\.00:1/);
  },
);

test("USMR site-g3f R2: a separate later midnight surface regression fails contrast", () => {
  const brokenCss = `${CSS}\n:root[data-theme="midnight"] { --bg-1: oklch(0.55 0.020 195); }`;
  const pair = NORMAL_TEXT_PAIRS.find(
    (pair) => pair.fg === "--fg-2" && pair.bg === "--bg-1",
  )!;
  const hex = themeHex(brokenCss, "midnight");
  expect(hex["--bg-1"]).toBe(oklchToHex(0.55, 0.02, 195));
  expect(() => assertContrast(pair, hex)).toThrow(/= 1\.94:1/);
});

test("USMR site-g3f R2: later bare root defaults apply outside media only", () => {
  const css = `${CSS}\n:root { --nd-fg-2: oklch(0.55 0.020 195); }
    @media (forced-colors: active) { :root { --nd-fg-2: CanvasText; } }`;
  for (const theme of THEMES) {
    expect(themeHex(css, theme)["--fg-2"]).toBe(oklchToHex(0.55, 0.02, 195));
  }
});

function assertThemeLayering(css: string): void {
  const rules = cssRules(css);
  const mapped = new Set(
    rules
      .filter(
        (rule) =>
          rule.selector === ":root" &&
          rule.ancestors.some((parent) =>
            /^@media\b.*\(\s*forced-colors\s*:\s*active\s*\)/s.test(parent),
          ),
      )
      .flatMap((rule) => Object.keys(declarationsIn(rule.body))),
  );
  expect(
    mapped.size,
    "Forced-colors token map must be present",
  ).toBeGreaterThan(0);
  // USMR site-g3f R1: preserve the pre-existing --bg exception (I1).
  mapped.delete("--bg");
  const violations = rules
    .filter(
      (rule) =>
        THEME_SELECTOR.test(rule.selector) &&
        !rule.ancestors.some((parent) => /^@layer\b/.test(parent)),
    )
    .flatMap((rule) =>
      Object.keys(declarationsIn(rule.body))
        .filter((name) => mapped.has(name))
        .map((name) => `${rule.selector}: ${name}`),
    );
  expect(
    violations,
    `Unlayered theme tokens must not outrank the forced-colors map: ${violations.join(", ")}`,
  ).toEqual([]);
}

test("USMR site-g3f R1: unlayered themes preserve forced-colors token precedence", () => {
  assertThemeLayering(CSS);
});

test("USMR site-g3f R1: the layering assertion rejects an unlayered surface override", () => {
  const brokenCss = `${CSS}\n:root[data-theme="midnight"] { --bg-1: oklch(0.15 0.020 195); }`;
  expect(() => assertThemeLayering(brokenCss)).toThrow(/--bg-1/);
});
