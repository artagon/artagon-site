#!/usr/bin/env node
/**
 * oklch-to-hex.mjs
 *
 * Per `adopt-design-md-format` Phase 3.3:
 *   Reads OKLCH triples cited in DESIGN.md prose, emits hex equivalents,
 *   regenerates the conversion table in docs/design-md.md.
 *
 * Conversion math: OKLCH → OKLab → linear sRGB → sRGB → hex
 *   See https://www.w3.org/TR/css-color-4/#color-conversion-code
 *
 * Usage:
 *   node scripts/oklch-to-hex.mjs --print          # print table to stdout
 *   node scripts/oklch-to-hex.mjs --write          # update docs/design-md.md
 *   node scripts/oklch-to-hex.mjs --json           # emit JSON map (for sibling tools)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DESIGN_MD = join(ROOT, "DESIGN.md");

const FLAG = argv[2] ?? "--print";

// ---------- OKLCH → hex conversion ----------

// OKLCH(L, C, H) → OKLab(L, a, b)
function oklchToOklab(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
}

// OKLab → linear sRGB (Björn Ottosson 2020)
function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

// Linear sRGB → sRGB (gamma-encoded)
function linearToSrgb(c) {
  if (c <= 0.0031308) return 12.92 * c;
  return 1.055 * c ** (1 / 2.4) - 0.055;
}

// sRGB [0..1] → 8-bit hex byte, gamut-clipped
function toHexByte(c) {
  const clipped = Math.max(0, Math.min(1, c));
  const byte = Math.round(clipped * 255);
  return byte.toString(16).padStart(2, "0");
}

export function oklchToHex(L, C, H) {
  const [oL, oa, ob] = oklchToOklab(L, C, H);
  const [r, g, b] = oklabToLinearSrgb(oL, oa, ob);
  return `#${toHexByte(linearToSrgb(r))}${toHexByte(linearToSrgb(g))}${toHexByte(linearToSrgb(b))}`;
}

// ---------- Parse OKLCH from DESIGN.md ----------

// Matches `--token-name` ... `oklch(L C H)` on the same markdown row.
// Allows arbitrary backticks/pipes/whitespace between the token name
// and the OKLCH triple (markdown pipe-table cells).
const OKLCH_REGEX =
  /(--[a-z][a-z0-9-]*)[^\n]*?oklch\(\s*([\d.]+)\s+([\d.]+)\s+(-?[\d.]+)\s*\)/g;

function parseDesignMd(body) {
  const tokens = [];
  const seen = new Set();
  for (const match of body.matchAll(OKLCH_REGEX)) {
    const [, name, l, c, h] = match;
    if (seen.has(name)) continue;
    seen.add(name);
    tokens.push({
      name,
      L: parseFloat(l),
      C: parseFloat(c),
      H: parseFloat(h),
      hex: oklchToHex(parseFloat(l), parseFloat(c), parseFloat(h)),
    });
  }
  return tokens;
}

// ---------- Output formatters ----------

function printTable(tokens) {
  const rows = [
    "| Token | OKLCH | sRGB hex |",
    "| --- | --- | --- |",
    ...tokens.map(
      (t) =>
        `| \`${t.name}\` | \`oklch(${t.L} ${t.C} ${t.H})\` | \`${t.hex}\` |`,
    ),
  ];
  return rows.join("\n");
}

function printJson(tokens) {
  return JSON.stringify(
    Object.fromEntries(tokens.map((t) => [t.name, t.hex])),
    null,
    2,
  );
}

// ---------- Main ----------

if (!existsSync(DESIGN_MD)) {
  console.error(`✗ DESIGN.md not found at ${DESIGN_MD}`);
  exit(1);
}

const body = readFileSync(DESIGN_MD, "utf8");
const tokens = parseDesignMd(body);

if (tokens.length === 0) {
  console.error("✗ no OKLCH triples found in DESIGN.md");
  exit(1);
}

if (FLAG === "--json") {
  console.log(printJson(tokens));
  exit(0);
}

if (FLAG === "--write") {
  const docsPath = join(ROOT, "docs/design-md.md");
  if (!existsSync(docsPath)) {
    console.error(
      `✗ docs/design-md.md not found — author the doc first (Phase 5.1) or use --print.`,
    );
    exit(1);
  }
  const doc = readFileSync(docsPath, "utf8");
  const table = printTable(tokens);
  // Replace any existing `<!-- oklch-table:start --> ... <!-- oklch-table:end -->` block
  const re = /<!-- oklch-table:start -->([\s\S]*?)<!-- oklch-table:end -->/m;
  const next = re.test(doc)
    ? doc.replace(
        re,
        `<!-- oklch-table:start -->\n\n${table}\n\n<!-- oklch-table:end -->`,
      )
    : doc +
      `\n\n## OKLCH ↔ hex conversion table\n\n<!-- oklch-table:start -->\n\n${table}\n\n<!-- oklch-table:end -->\n`;
  writeFileSync(docsPath, next);
  console.log(`✓ updated ${docsPath} (${tokens.length} tokens)`);
  exit(0);
}

// Default: --print
console.log(printTable(tokens));
console.log(`\n# ${tokens.length} tokens`);
