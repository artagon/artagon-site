#!/usr/bin/env node
/**
 * lint-tokens.mjs
 *
 * Per USMR `style-system` §"Token Categories" (color subset):
 *
 *   Color literals (hex / rgb / rgba / hsl / hsla / oklch / oklab)
 *   in `.css` and `.mdx` files outside `public/assets/theme.css` are
 *   forbidden. All component CSS MUST consume colors via `var(--*)`.
 *
 *   `.astro` <style> blocks are covered by sibling ast-grep rules
 *   (rules/security/no-untraceable-token.yml + no-raw-color-literal.yml).
 *   This script covers .css and .mdx files that ast-grep doesn't lint
 *   well.
 *
 *   The spacing/sizing half of "Token Categories" (forbid raw px/em/rem
 *   outside theme.css) is NOT enforced here. Implementing it requires
 *   distinguishing legitimate uses (line-height: 1.5, calc() math,
 *   clamp() formulas already in theme.css) from forbidden ad-hoc
 *   spacing — a separate design decision tracked as a follow-up under
 *   USMR Phase 12 quality gates.
 *
 * Exit codes:
 *   0 — no token violations
 *   1 — violations found (each printed with file:line:col + offending text)
 *   2 — usage / IO error
 */

import { readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(argv[2] ? argv[2] : join(__dirname, ".."));

// theme.css is the ONE place tokens are DEFINED; everything else must
// consume via var(--*). DESIGN.md is the source of truth and may carry
// raw OKLCH literals in its frontmatter. Pre-pt76 theme.css was fully
// allowlisted, masking class-rule violations (pt74/pt75 caught 7).
//
// Post-pt76: DESIGN.md remains fully allowlisted. theme.css is scanned
// with a "skip token-definition lines" filter (see lintThemeCss): raw
// colors on lines containing a `--token:` declaration are legitimate;
// raw colors on any other line are violations.
const ALLOWLIST = new Set(["DESIGN.md"]);
const THEME_CSS = "public/assets/theme.css";

// Color literal patterns. Hex uses a lookbehind so the match itself is
// just `#hex` (reported file:line:col anchors at the `#`, not at the
// preceding delimiter). The lookbehind requires a CSS value-position
// character so we skip ID/href anchors like `#hash-link` in MDX prose.
// The function-name patterns are case-insensitive (`i` flag) because
// CSS function names ARE case-insensitive — `RGB(...)` is valid CSS
// and would otherwise bypass the gate.
const COLOR_PATTERNS = [
  { name: "hex", re: /(?<=[:,(\s\/])#[0-9a-fA-F]{3,8}\b/g },
  { name: "rgb", re: /\brgb\(/gi },
  { name: "rgba", re: /\brgba\(/gi },
  { name: "hsl", re: /\bhsl\(/gi },
  { name: "hsla", re: /\bhsla\(/gi },
  { name: "oklch", re: /\boklch\(/gi },
  { name: "oklab", re: /\boklab\(/gi },
];

function listTrackedFiles() {
  // Use git ls-files so generated artifacts under .build/, dist/,
  // node_modules/ are excluded by the project's .gitignore.
  try {
    const out = execFileSync("git", ["ls-files"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    });
    return out.split("\n").filter(Boolean);
  } catch (err) {
    console.error(
      `✗ lint-tokens: git ls-files failed: ${err.code ?? "unknown"} ${err.message}`,
    );
    exit(2);
  }
}

function shouldLint(relPath) {
  if (ALLOWLIST.has(relPath)) return false;
  return /\.(css|mdx)$/i.test(relPath);
}

// USMR 5.5.16-pt76 — theme.css uses a token-aware scan instead of the
// blanket allowlist. A char position is INSIDE a token DEFINITION (raw
// colors allowed) when the most recent declaration boundary (`{`, `;`,
// or start of file) is followed by `--name:`. This handles:
//   - one-decl-per-line theme.css style
//   - multi-decl-per-line cram-coded files
//   - multi-line values (shadow lists) — continuation across newlines
//     until the next `;`
function indexInTokenDeclaration(body, idx) {
  // Walk back from idx to find the nearest `{` or `;` (declaration
  // boundary). Then check whether the chars from there to idx open a
  // `--name:` declaration.
  let i = idx;
  while (i > 0) {
    const ch = body[i - 1];
    if (ch === ";" || ch === "{") break;
    i--;
  }
  // body[i .. idx] is the current declaration prefix. Match against
  // `\s*--[\w-]+\s*:` — i.e., whitespace, `--`, an identifier, `:`.
  const segment = body.slice(i, idx);
  return /\s*--[a-zA-Z][\w-]*\s*:/.test(segment);
}

// Strip CSS `/* ... */` comments (replace with same-length whitespace
// so line + column positions remain accurate). Special case: keep
// `/* lint-tokens: ok */` markers visible as-is so the per-line check
// can still detect them.
function stripCssComments(body) {
  return body.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    if (/lint-tokens:\s*ok/i.test(match)) return match;
    return match.replace(/[^\n]/g, " ");
  });
}

// Per-line allow marker. Used for absolute-color gradient/mask shapes
// (e.g. `linear-gradient(#000 0 0)` for compositing masks; `#fff`
// shimmer highlights in glow-text gradient stops) where a `var()` would
// change the visual effect or be semantically wrong.
function isLineAllowed(line) {
  return /\/\*\s*lint-tokens:\s*ok\s*\*\//i.test(line);
}

function scanThemeCss(body, relPath) {
  const violations = [];
  // Strip comments first so prose mentions like "oklch(0.62 …)" inside
  // /* ... */ don't trigger false positives. lint-tokens:ok markers
  // are preserved by stripCssComments so the per-line allow check can
  // still find them.
  const stripped = stripCssComments(body);
  // Build a line-start index so we can map character offsets back to
  // (line, col) for the violation report.
  const lineStarts = [0];
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "\n") lineStarts.push(i + 1);
  }
  const lineOf = (idx) => {
    // Binary search lineStarts.
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: idx - lineStarts[lo] + 1 };
  };
  // Pre-compute which lines carry a /* lint-tokens: ok */ marker.
  const allowLines = new Set();
  const origLines = body.split("\n");
  for (let i = 0; i < origLines.length; i++) {
    if (isLineAllowed(origLines[i])) allowLines.add(i + 1);
  }
  // Scan the whole stripped body for color literals.
  for (const { name, re } of COLOR_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(stripped)) !== null) {
      const idx = m.index;
      const { line, col } = lineOf(idx);
      // Allow if the line carries a `/* lint-tokens: ok */` marker.
      if (allowLines.has(line)) continue;
      // Allow if the position is inside a `--name:` declaration.
      if (indexInTokenDeclaration(stripped, idx)) continue;
      // Allow if inside a `var(--token, FALLBACK)` call. Walk back to
      // find an unclosed `var(` with no balancing `)` in between.
      const before = stripped.slice(0, idx);
      const lastVar = before.lastIndexOf("var(");
      if (lastVar !== -1) {
        const between = stripped.slice(lastVar + 4, idx);
        let opens = 0;
        let closes = 0;
        for (const ch of between) {
          if (ch === "(") opens++;
          else if (ch === ")") closes++;
        }
        if (opens >= closes) continue;
      }
      violations.push({ relPath, line, col, kind: name, text: m[0] });
    }
  }
  return violations;
}

function lintFile(absPath, relPath) {
  let body;
  try {
    body = readFileSync(absPath, "utf8");
  } catch (err) {
    console.error(
      `✗ lint-tokens: cannot read ${relPath}: ${err.code ?? "unknown"}`,
    );
    return [];
  }
  const violations = [];
  // For .mdx, only lint inside ```css ... ``` fences and <style> blocks;
  // prose may legitimately mention "#0b1220" as text. For .css, lint the
  // entire body.
  let scanRegions;
  if (relPath.endsWith(".mdx")) {
    scanRegions = [];
    const fenceRe = /```css\b[\s\S]*?```/g;
    const styleRe = /<style[^>]*>[\s\S]*?<\/style>/g;
    for (const m of body.matchAll(fenceRe)) scanRegions.push([m.index, m[0]]);
    for (const m of body.matchAll(styleRe)) scanRegions.push([m.index, m[0]]);
  } else {
    scanRegions = [[0, body]];
  }

  for (const [offset, region] of scanRegions) {
    for (const { name, re } of COLOR_PATTERNS) {
      // Reset lastIndex on shared regex objects (g flag).
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(region)) !== null) {
        const absIdx = offset + m.index;
        const before = body.slice(0, absIdx);
        const line = before.split("\n").length;
        const col = absIdx - before.lastIndexOf("\n");
        violations.push({
          relPath,
          line,
          col,
          kind: name,
          text: m[0],
        });
      }
    }
  }
  return violations;
}

function main() {
  let stat;
  try {
    stat = statSync(ROOT);
  } catch (err) {
    console.error(
      `✗ lint-tokens: cannot stat ROOT (${ROOT}): ${err.code ?? "unknown"}`,
    );
    exit(2);
  }
  if (!stat.isDirectory()) {
    console.error(`✗ lint-tokens: ROOT is not a directory: ${ROOT}`);
    exit(2);
  }

  const files = listTrackedFiles();
  const all = [];
  for (const rel of files) {
    const abs = join(ROOT, rel);
    if (rel === THEME_CSS) {
      // Scan with the token-definition-aware filter.
      let body;
      try {
        body = readFileSync(abs, "utf8");
      } catch (err) {
        console.error(
          `✗ lint-tokens: cannot read ${rel}: ${err.code ?? "unknown"}`,
        );
        continue;
      }
      all.push(...scanThemeCss(body, rel));
      continue;
    }
    if (!shouldLint(rel)) continue;
    all.push(...lintFile(abs, rel));
  }

  if (all.length === 0) {
    console.log(
      `✓ lint-tokens: no raw color literals found outside ${[...ALLOWLIST].join(", ")}`,
    );
    exit(0);
  }

  for (const v of all) {
    console.error(
      `✗ ${v.relPath}:${v.line}:${v.col} — raw ${v.kind} literal: ${v.text.trim()}`,
    );
  }
  console.error(
    `\n${all.length} token violation${all.length === 1 ? "" : "s"}. Replace with var(--token-name) declared in public/assets/theme.css.`,
  );
  exit(1);
}

main();
