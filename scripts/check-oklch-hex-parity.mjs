#!/usr/bin/env node
/**
 * check-oklch-hex-parity.mjs
 *
 * Per `adopt-design-md-format` Phase 3.3a:
 *   Re-derive hex from prose-cited OKLCH triples in DESIGN.md, fail if
 *   any frontmatter hex differs from the derived hex by more than 1 LSB
 *   per channel.
 *
 * Invoked as a precondition of `npm run lint:design`.
 *
 * Exit codes:
 *   0 — frontmatter hex values match derived hex (within 1-LSB tolerance)
 *   1 — drift detected (one or more tokens are out of tolerance)
 *   2 — usage error (DESIGN.md missing or no frontmatter)
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exit } from "node:process";
import { oklchToHex } from "./oklch-to-hex.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESIGN_MD = join(__dirname, "..", "DESIGN.md");

if (!existsSync(DESIGN_MD)) {
  console.error(`✗ DESIGN.md not found at ${DESIGN_MD}`);
  exit(2);
}

const body = readFileSync(DESIGN_MD, "utf8");

// ---------- Extract frontmatter ----------

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;
const fmMatch = body.match(FRONTMATTER_RE);
if (!fmMatch) {
  console.warn(
    "⚠ DESIGN.md has no YAML frontmatter — parity check skipped (Phase 3.2 pending).",
  );
  exit(0);
}

const frontmatter = fmMatch[1];

// ---------- Parse hex tokens from frontmatter ----------
// Looking for entries like:
//   bg: "#07090c"
//   accent: "#3ceedd"
// under a `colors:` block. We accept both quoted and unquoted hex.

const HEX_RE =
  /^\s+(?:--)?([a-z][a-z0-9-]*)\s*:\s*['"]?(#[0-9a-fA-F]{6,8})['"]?/gm;
const frontmatterHex = new Map();
for (const match of frontmatter.matchAll(HEX_RE)) {
  const [, name, hex] = match;
  frontmatterHex.set(`--${name}`, hex.toLowerCase());
}

if (frontmatterHex.size === 0) {
  console.warn(
    "⚠ DESIGN.md frontmatter has no color tokens — parity check skipped.",
  );
  exit(0);
}

// ---------- Parse OKLCH triples from prose ----------

const OKLCH_RE =
  /(--[a-z][a-z0-9-]*)[^\n]*?oklch\(\s*([\d.]+)\s+([\d.]+)\s+(-?[\d.]+)\s*\)/g;
const proseHex = new Map();
for (const match of body.matchAll(OKLCH_RE)) {
  const [, name, l, c, h] = match;
  proseHex.set(name, oklchToHex(parseFloat(l), parseFloat(c), parseFloat(h)));
}

// ---------- Compare ----------

function hexToBytes(hex) {
  const h = hex.replace(/^#/, "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function maxChannelDelta(a, b) {
  const [ar, ag, ab] = hexToBytes(a);
  const [br, bg, bb] = hexToBytes(b);
  return Math.max(Math.abs(ar - br), Math.abs(ag - bg), Math.abs(ab - bb));
}

const TOLERANCE = 1; // 1 LSB per channel
const drifts = [];
for (const [name, fmHex] of frontmatterHex) {
  const derived = proseHex.get(name);
  if (!derived) {
    console.warn(
      `⚠ ${name}: frontmatter hex ${fmHex} has no matching prose OKLCH (skipped).`,
    );
    continue;
  }
  const delta = maxChannelDelta(fmHex, derived);
  if (delta > TOLERANCE) {
    drifts.push({ name, fmHex, derived, delta });
  }
}

if (drifts.length > 0) {
  console.error(
    `✗ OKLCH↔hex parity drift in DESIGN.md (${drifts.length} tokens out of tolerance, max channel delta ${TOLERANCE} LSB):`,
  );
  for (const d of drifts) {
    console.error(
      `  ${d.name}: frontmatter=${d.fmHex} derived=${d.derived} max-channel-delta=${d.delta}`,
    );
  }
  console.error(
    "\n  Re-derive: npm run derive:hex   then update DESIGN.md frontmatter.",
  );
  exit(1);
}

console.log(
  `✓ OKLCH↔hex parity OK (${frontmatterHex.size} tokens within ${TOLERANCE}-LSB tolerance)`,
);
