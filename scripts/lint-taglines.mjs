#!/usr/bin/env node
/**
 * lint-taglines.mjs
 *
 * Per USMR `site-content` §"Tagline single source":
 *
 *   `tagline.short` and `tagline.triad` values defined in
 *   `src/content/taglines.json` MUST NOT appear verbatim as string
 *   literals in any source file outside that JSON file itself.
 *
 *   Scans all *.astro, *.ts, *.tsx, *.mjs files under src/.
 *   Excludes *.mdx (authored prose content where tagline text is legitimate).
 *   Excludes the canonical taglines.json file itself.
 *
 * Exit codes:
 *   0 — no verbatim tagline literals found outside taglines.json
 *   1 — at least one violation found
 *   2 — usage / IO error (taglines.json missing or malformed)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit, stdout, stderr } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(argv[2] ? argv[2] : join(__dirname, ".."));

const TAGLINES_PATH = join(ROOT, "src", "content", "taglines.json");
let taglinesRaw;
try {
  taglinesRaw = JSON.parse(readFileSync(TAGLINES_PATH, "utf8"));
} catch (err) {
  stderr.write(
    `lint-taglines: cannot read src/content/taglines.json: ${err.message}\n`,
  );
  exit(2);
}

const tg = taglinesRaw?.tagline;
if (!tg || typeof tg.short !== "string" || !Array.isArray(tg.triad)) {
  stderr.write(
    `lint-taglines: taglines.json must have tagline.short (string) and tagline.triad (array)\n`,
  );
  exit(2);
}

// Collect all strings that must not appear verbatim in source files.
const GUARDED = [tg.short, ...tg.triad].filter(Boolean);

const SCAN_EXTS = new Set([".astro", ".ts", ".tsx", ".mjs"]);
const SRC_DIR = join(ROOT, "src");

function walkSrc(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSrc(full, acc);
    } else if (entry.isFile()) {
      const ext = full.slice(full.lastIndexOf("."));
      if (SCAN_EXTS.has(ext)) acc.push(full);
    }
  }
  return acc;
}

if (!existsSync(SRC_DIR)) {
  stderr.write(`lint-taglines: src/ directory not found at ${SRC_DIR}\n`);
  exit(2);
}

const sourceFiles = walkSrc(SRC_DIR).filter(
  (f) => resolve(f) !== resolve(TAGLINES_PATH),
);

const violations = [];

for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  for (const guarded of GUARDED) {
    if (content.includes(guarded)) {
      violations.push({
        file: relative(ROOT, file),
        literal: guarded,
      });
    }
  }
}

if (violations.length === 0) {
  stdout.write(
    `lint-taglines: ${sourceFiles.length} file(s) scanned — all tagline strings sourced from taglines.json\n`,
  );
  exit(0);
}

stderr.write(`lint-taglines: ${violations.length} violation(s):\n`);
for (const v of violations) {
  stderr.write(`  ${v.file}: hardcoded tagline literal "${v.literal}"\n`);
}
stderr.write(
  `lint-taglines: import taglines from 'src/content/taglines.json' instead of hardcoding strings\n`,
);
exit(1);
