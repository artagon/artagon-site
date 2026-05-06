#!/usr/bin/env node
/**
 * lint-skip-link.mjs
 *
 * Per USMR `site-navigation` §"Skip Link":
 *
 *   Every built HTML page in `.build/dist/` MUST contain a skip-link
 *   anchor (<a class="skip-link" href="#main-content">) as the FIRST
 *   focusable element in the document, and the skip-link's target
 *   (#main-content) MUST exist on the page.
 *
 *   "First focusable" means: appears in source order before any other
 *   <a href>, <button>, <input>, <select>, <textarea>, or
 *   tabindex>=0 element.
 *
 * Exit codes:
 *   0 — every page has a valid skip-link
 *   1 — at least one page is missing or has a malformed skip-link
 *   2 — usage / IO error
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit, stdout, stderr } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(argv[2] ? argv[2] : join(__dirname, ".."));

const buildConfigPath = join(ROOT, "build.config.json");
let DIST_DIR;
try {
  const cfg = JSON.parse(readFileSync(buildConfigPath, "utf8"));
  DIST_DIR = resolve(ROOT, cfg.dist);
} catch (err) {
  stderr.write(
    `lint-skip-link: cannot read build.config.json: ${err.message}\n`,
  );
  exit(2);
}

if (!existsSync(DIST_DIR)) {
  stderr.write(
    `lint-skip-link: dist dir ${relative(ROOT, DIST_DIR)} not found — run \`npm run build\` first\n`,
  );
  exit(2);
}

function walkHtml(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, acc);
    else if (entry.isFile() && entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

// Crude but reliable focusable detector: matches the OPENING tag of any
// element that participates in tab order. Anchors only count if they
// have an href; tabindex must be >= 0 to be focusable. Hidden elements
// are still considered violations because hidden=true on the skip-link
// itself would defeat the lint.
const FOCUSABLE_OPEN =
  /<(?:a\s[^>]*\bhref\b|button(?:\s|>)|input(?:\s|>)|select(?:\s|>)|textarea(?:\s|>)|[a-z][a-z0-9-]*\s[^>]*\btabindex\s*=\s*["']?(?:0|[1-9])["']?)/i;
const SKIP_LINK_RE =
  /<a\b[^>]*\bclass\s*=\s*["'][^"']*\bskip-link\b[^"']*["'][^>]*\bhref\s*=\s*["']#([^"']+)["']/i;
const SKIP_LINK_HREF_FIRST_RE =
  /<a\b[^>]*\bhref\s*=\s*["']#([^"']+)["'][^>]*\bclass\s*=\s*["'][^"']*\bskip-link\b[^"']*["']/i;
const ID_TARGET_RE = (id) =>
  new RegExp(
    `\\bid\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}["']`,
  );

const violations = [];
const htmlFiles = walkHtml(DIST_DIR);

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const rel = relative(DIST_DIR, file);

  // Strip <head> (skip-link is a body element). Find first focusable in <body>.
  const bodyOpen = html.search(/<body\b[^>]*>/i);
  if (bodyOpen === -1) {
    violations.push({ file: rel, reason: "no <body> tag found" });
    continue;
  }
  const bodyHtml = html.slice(bodyOpen);

  const focusableMatch = bodyHtml.match(FOCUSABLE_OPEN);
  if (!focusableMatch) {
    violations.push({ file: rel, reason: "no focusable elements in <body>" });
    continue;
  }
  const firstFocusableIdx = focusableMatch.index;
  const firstFocusableTag = bodyHtml.slice(
    firstFocusableIdx,
    bodyHtml.indexOf(">", firstFocusableIdx) + 1,
  );

  const isSkipLink =
    SKIP_LINK_RE.test(firstFocusableTag) ||
    SKIP_LINK_HREF_FIRST_RE.test(firstFocusableTag);
  if (!isSkipLink) {
    violations.push({
      file: rel,
      reason: `first focusable is not a skip-link: ${firstFocusableTag.slice(0, 120)}`,
    });
    continue;
  }

  // Verify the skip-link's target id exists on the page.
  const hrefMatch =
    firstFocusableTag.match(SKIP_LINK_RE) ||
    firstFocusableTag.match(SKIP_LINK_HREF_FIRST_RE);
  const targetId = hrefMatch[1];
  if (!ID_TARGET_RE(targetId).test(html)) {
    violations.push({
      file: rel,
      reason: `skip-link target #${targetId} not found on page`,
    });
  }
}

if (violations.length === 0) {
  stdout.write(
    `lint-skip-link: ${htmlFiles.length} page(s) verified — all have a valid skip-link as first focusable element\n`,
  );
  exit(0);
}

stderr.write(`lint-skip-link: ${violations.length} violation(s):\n`);
for (const v of violations) {
  stderr.write(`  ${v.file}: ${v.reason}\n`);
}
exit(1);
