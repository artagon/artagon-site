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

// theme.css is the ONE place tokens are defined; everything else must
// consume via var(--*). DESIGN.md is the source of truth and may carry
// raw OKLCH literals in its frontmatter.
const ALLOWLIST = new Set(["public/assets/theme.css", "DESIGN.md"]);

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
    if (!shouldLint(rel)) continue;
    const abs = join(ROOT, rel);
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
