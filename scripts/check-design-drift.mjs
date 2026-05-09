#!/usr/bin/env node
/**
 * check-design-drift.mjs
 *
 * Per `adopt-design-md-format` Phase 6.1–6.2 (proposal archived
 * 2026-05-05 to `openspec/changes/archive/2026-05-05-adopt-design-md-format/`;
 * the live spec is `openspec/specs/design-system-format/spec.md`):
 *   Asserts that every CSS custom property declared in `public/assets/theme.css`
 *   resolves to a token in `DESIGN.md` YAML frontmatter — or appears on the
 *   documented allow-list in `docs/design-md.md` Section 6.
 *
 * Naming convention (DESIGN.md frontmatter ↔ CSS custom property):
 *
 *   1. Bare-name match (the project's prevailing style):
 *        `--bg`        → resolves to `colors.bg`
 *        `--accent`    → resolves to `colors.accent`
 *        `--fg-1`      → resolves to `colors.fg-1`
 *
 *   2. Namespaced match (the spec-documented form):
 *        `--color-bg`     → resolves to `colors.bg`     (drop `color-`)
 *        `--rounded-md`   → resolves to `rounded.md`    (drop `rounded-`)
 *        `--spacing-xs`   → resolves to `spacing.xs`    (drop `spacing-`)
 *        `--font-display-family`  → resolves to `typography.display.fontFamily`
 *        `--font-body-size`       → resolves to `typography.body.fontSize`
 *
 *   3. Anything else is an orphan and must appear on the allow-list.
 *
 * Allow-list (soft contract): backtick-quoted CSS-custom-property names that
 * appear inside Section 6 of `docs/design-md.md`. The script reads that file,
 * locates the `## 6 ·` heading, walks until the next `## ` heading at the same
 * level, and extracts every ``--token-name`` reference. Each allow-listed
 * token MUST have a one-paragraph rationale in the same section — the
 * presence-check is automatic; the rationale-quality check is a human gate.
 *
 * Modes:
 *   --seed-allow-list  print orphans as paste-ready Markdown sub-sections to
 *                      stdout. Does NOT modify any file.
 *
 * Exit codes:
 *   0  no drift (or seed mode finished successfully)
 *   1  drift detected — orphans not on the allow-list
 *   2  environment error — DESIGN.md, theme.css, or docs/design-md.md missing
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DESIGN_MD = join(REPO_ROOT, "DESIGN.md");
const THEME_CSS = join(REPO_ROOT, "public", "assets", "theme.css");
const DOCS_DESIGN_MD = join(REPO_ROOT, "docs", "design-md.md");

const SEED_MODE = argv.includes("--seed-allow-list");

// ---------- Environment guards ----------

for (const [label, path] of [
  ["DESIGN.md", DESIGN_MD],
  ["public/assets/theme.css", THEME_CSS],
  ["docs/design-md.md", DOCS_DESIGN_MD],
]) {
  if (!existsSync(path)) {
    console.error(`✗ ${label} not found at ${path}`);
    exit(2);
  }
}

// ---------- Parse DESIGN.md frontmatter ----------
//
// The frontmatter is the YAML between the first two `---` lines that bracket
// the file (NOT the table-separator `---` inside prose). We slice the block
// out, then walk it line-by-line. The shape we expect is well-known:
//
//   colors:
//     bg: "#07090c"
//     bg-1: "#0d1013"
//   typography:
//     display:
//       fontFamily: …
//       fontSize:   …
//   spacing:
//     xs: 4px
//   rounded:
//     sm: 4px
//   components:
//     nav:
//       backgroundColor: "{colors.bg}"
//
// We only care about the FOUR top-level groups that the spec calls out:
// `colors`, `typography`, `spacing`, `rounded`. (`components` reference the
// others; they do not introduce new tokens.)

function extractFrontmatter(body) {
  const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;
  const m = body.match(FRONTMATTER_RE);
  return m ? m[1] : null;
}

function parseFrontmatterTokens(yaml) {
  // Build a flat lookup: every legal "token name" the CSS may reference.
  // For colors/spacing/rounded: the leaf key is the name (e.g., "bg", "md").
  // For typography: the leaf is the dotted-path "scale.property" (e.g.,
  //   "display.fontFamily"); the scale alone (e.g., "display") is also valid
  //   because components reference whole typography scales.

  const colors = new Set();
  const spacing = new Set();
  const rounded = new Set();
  const typography = new Set();

  let group = null; // "colors" | "typography" | "spacing" | "rounded" | other
  let typographyScale = null;

  for (const raw of yaml.split("\n")) {
    if (raw.length === 0) continue;
    // Top-level key (no leading whitespace, ends with `:`).
    const top = raw.match(/^([a-z][a-z0-9-]*):\s*$/);
    if (top) {
      group = top[1];
      typographyScale = null;
      continue;
    }
    // 2-space indented child.
    const child = raw.match(/^\s{2}([a-z0-9][a-z0-9-]*)\s*:\s*(.*)$/i);
    if (!child) continue;
    const [, key, rest] = child;

    if (group === "colors" && rest !== "") colors.add(key);
    else if (group === "spacing" && rest !== "") spacing.add(key);
    else if (group === "rounded" && rest !== "") rounded.add(key);
    else if (group === "typography") {
      // 2-space child of typography is a scale name (display/body/mono).
      typographyScale = key;
      typography.add(key);
      continue;
    }

    // 4-space grandchild (typography scale properties).
    const grand = raw.match(/^\s{4}([a-zA-Z][a-zA-Z0-9]*)\s*:\s*(.*)$/);
    if (grand && group === "typography" && typographyScale) {
      typography.add(`${typographyScale}.${grand[1]}`);
    }
  }

  return { colors, spacing, rounded, typography };
}

// ---------- Parse theme.css custom properties ----------
//
// Match every `--<name>: <value>;` declaration. We do NOT distinguish between
// `:root`, `[data-theme]`, `:where()`, or class-block scopes — for the drift
// check, a token is a token regardless of selector. Names are deduped.

function parseCssCustomProperties(css) {
  const DECL_RE = /(?<![\w-])--([a-zA-Z][\w-]*)\s*:\s*[^;]+;/g;
  const names = new Set();
  for (const m of css.matchAll(DECL_RE)) {
    names.add(m[1]);
  }
  return names;
}

// ---------- Resolve a CSS token against frontmatter ----------

function resolveToken(name, fm) {
  // 1. Bare-name match against any namespace.
  if (fm.colors.has(name)) return { ns: "colors", key: name };
  if (fm.spacing.has(name)) return { ns: "spacing", key: name };
  if (fm.rounded.has(name)) return { ns: "rounded", key: name };
  if (fm.typography.has(name)) return { ns: "typography", key: name };

  // 2. Namespaced form: `<prefix>-<rest>`.
  const prefixes = [
    ["color-", "colors"],
    ["spacing-", "spacing"],
    ["rounded-", "rounded"],
  ];
  for (const [prefix, ns] of prefixes) {
    if (name.startsWith(prefix)) {
      const key = name.slice(prefix.length);
      if (fm[ns].has(key)) return { ns, key };
    }
  }

  // 3. Typography: `font-<scale>-<property>` where property is one of
  //    family|size|weight|height. Map to typography.<scale>.<fontProperty>.
  const FONT_RE = /^font-([a-z][a-z0-9-]*)-(family|size|weight|height)$/;
  const fm2 = name.match(FONT_RE);
  if (fm2) {
    const [, scale, propShort] = fm2;
    const propMap = {
      family: "fontFamily",
      size: "fontSize",
      weight: "fontWeight",
      height: "lineHeight",
    };
    const dotted = `${scale}.${propMap[propShort]}`;
    if (fm.typography.has(dotted)) return { ns: "typography", key: dotted };
    // also accept `font-<scale>` → typography.<scale>
    if (fm.typography.has(scale)) return { ns: "typography", key: scale };
  }

  return null;
}

// ---------- Parse the allow-list from docs/design-md.md Section 6 ----------
//
// Contract: extract every `--token-name` (backtick-fenced CSS custom
// property) found between the Section 6 heading and the next top-level
// heading. Section 7 (the lint-warning table) is excluded.
//
// Robustness:
// - Heading regex matches BOTH `## 6 ·` (U+00B7 middle dot, current style)
//   AND `## 6.` / `## 6 -` / `## 6` alone, so editor-normalized variants
//   don't silently skip the section.
// - Fenced code blocks (``` ... ```) are tracked: backtick token references
//   inside a fenced block are NOT part of the allow-list (they're examples).
// - If Section 6 is missing entirely or empty, exit 2 (env error) — silent
//   fallback to an empty allow-list would mask a doc-rot bug.

function parseAllowList(docs) {
  const lines = docs.split("\n");
  let inSection6 = false;
  let inFencedBlock = false;
  let section6Seen = false;
  const allow = new Set();
  for (const line of lines) {
    // Track fenced code blocks. A line that starts with ``` toggles state.
    if (/^```/.test(line)) {
      inFencedBlock = !inFencedBlock;
      continue;
    }
    // Section 6 detection — accept several middle-dot-or-not variants so
    // editor normalization doesn't silently break the gate.
    const heading = line.match(/^##\s+(\d+)(?:\s*[·.\-]\s*|\s+)/);
    if (heading) {
      inSection6 = heading[1] === "6";
      if (inSection6) section6Seen = true;
      continue;
    }
    if (!inSection6) continue;
    if (inFencedBlock) continue;
    for (const m of line.matchAll(/`--([a-zA-Z][\w-]+)`/g)) {
      allow.add(m[1]);
    }
  }
  if (!section6Seen) {
    console.error(
      "✗ docs/design-md.md is missing Section 6 (allow-list). Refusing to silently treat allow-list as empty.",
    );
    exit(2);
  }
  return allow;
}

// ---------- Run ----------

const designBody = readFileSync(DESIGN_MD, "utf8");
const themeCss = readFileSync(THEME_CSS, "utf8");
const docsBody = readFileSync(DOCS_DESIGN_MD, "utf8");

const yaml = extractFrontmatter(designBody);
if (!yaml) {
  console.error(
    "✗ DESIGN.md has no YAML frontmatter — the canonical structure (per `adopt-design-md-format` archived 2026-05-05) requires `---`-fenced YAML at the top of DESIGN.md with `version`, `name`, `description`, `colors`, etc. If frontmatter was removed, restore it; the format spec is mirrored at `openspec/.cache/design-md-spec.md` and the upstream is `npx @google/design.md spec`.",
  );
  exit(2);
}

const fm = parseFrontmatterTokens(yaml);
const cssNames = parseCssCustomProperties(themeCss);
const allowList = parseAllowList(docsBody);

const resolved = [];
const orphans = [];
for (const name of [...cssNames].sort()) {
  const hit = resolveToken(name, fm);
  if (hit) resolved.push({ name, ...hit });
  else if (allowList.has(name))
    resolved.push({ name, ns: "allow-list", key: name });
  else orphans.push(name);
}

if (SEED_MODE) {
  // Print orphans as paste-ready Markdown into Section 6.
  console.log(
    `# check-design-drift seed — ${orphans.length} orphan(s) detected\n`,
  );
  console.log(
    "Paste each block below into `docs/design-md.md` Section 6 with a one-paragraph rationale.\n",
  );
  for (const name of orphans) {
    console.log(`### \`--${name}\``);
    console.log("");
    console.log(
      "TODO(human): rationale — why does this token exist outside DESIGN.md frontmatter?",
    );
    console.log("");
  }
  console.log(
    `Resolved against frontmatter: ${resolved.length}; orphans: ${orphans.length}.`,
  );
  exit(0);
}

if (orphans.length > 0) {
  console.error(
    `✗ design drift: ${orphans.length} CSS custom propert${orphans.length === 1 ? "y" : "ies"} declared in public/assets/theme.css ` +
      `do not resolve to a DESIGN.md frontmatter token and are not on the allow-list ` +
      `in docs/design-md.md Section 6:\n`,
  );
  for (const name of orphans) {
    console.error(`    --${name}`);
  }
  console.error(
    `\n  Fix paths:\n` +
      `    1. Map the token to a DESIGN.md frontmatter entry, OR\n` +
      `    2. Run \`node scripts/check-design-drift.mjs --seed-allow-list\`\n` +
      `       and paste the emitted entries into docs/design-md.md Section 6\n` +
      `       with a rationale for each.\n`,
  );
  exit(1);
}

console.log(
  `✓ design drift OK: ${resolved.length} CSS custom propert${resolved.length === 1 ? "y" : "ies"} resolved ` +
    `(frontmatter + allow-list); 0 orphans.`,
);
