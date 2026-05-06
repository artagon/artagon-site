#!/usr/bin/env node
/**
 * verify-font-self-hosting.mjs
 *
 * Per USMR Phase 2 §"CSP font-src is self-only":
 *
 *   The CSP `font-src` directive is locked to `'self'` only. If any
 *   built HTML route under `dist/**` references a third-party font
 *   host (fonts.googleapis.com, fonts.gstatic.com, use.typekit.net,
 *   etc.) the live site will silently fail to load fonts when CSP
 *   blocks the request — and the runtime error only fires in the
 *   browser, not at build time.
 *
 *   This script is the build-time fence against that regression.
 *   Any third-party `<link href="https://fonts.*">` or `@import url()`
 *   in the built tree fails the build.
 *
 *   Wire into postbuild after `csp.mjs`.
 *
 * Exit codes:
 *   0 — no third-party font references found in dist/**
 *   1 — at least one third-party font reference found
 *   2 — usage / IO error (dist/ missing, ROOT not a directory, etc.)
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(argv[2] ? argv[2] : join(__dirname, ".."));

// build.config.json puts the dist root at .build/dist by default.
// Allow argv[3] to override for tests.
const DIST = resolve(argv[3] ? argv[3] : join(ROOT, ".build", "dist"));

// Two-tier match. Tier 1 (FONT_HOSTS) is a closed set of dedicated
// font CDNs — any URL hitting one of these hosts is presumed to be a
// font load and is flagged unconditionally. Tier 2 (GENERIC_CDNS) is
// general-purpose package CDNs that legitimately serve JS/CSS bundles
// AND can be used to ship WOFF2; only matches that ALSO look font-shaped
// (path contains a font extension or a `/fonts/` segment) are flagged.
// This avoids false-positives on legitimate non-font CDN scripts (e.g.
// Algolia DocSearch via cdn.jsdelivr.net).
const FONT_HOSTS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "use.typekit.net",
  "p.typekit.net",
  "fast.fonts.net",
  "kit.fontawesome.com",
  "ka-f.fontawesome.com",
  "api.fontshare.com",
];
const GENERIC_CDNS = ["cdn.jsdelivr.net", "cdnjs.cloudflare.com", "unpkg.com"];

// Match anything containing a forbidden host — we then do a per-match
// font-shape check on the URL substring around the match.
const HOST_RE = new RegExp(
  [...FONT_HOSTS, ...GENERIC_CDNS]
    .map((h) => h.replace(/\./g, "\\."))
    .join("|"),
  "g",
);

const FONT_PATH_RE = /\.(woff2?|ttf|otf|eot)\b|\/fonts?\//i;
const FONT_HOSTS_SET = new Set(FONT_HOSTS);

// Extract the URL surrounding a host match so we can pattern-match the
// path. We greedily expand left/right within the same line until we
// hit a delimiter that can't be part of a URL ("'`<> ,;).
function urlAround(body, idx) {
  const STOP = /["'`<>,; ()]/;
  let start = idx;
  while (start > 0 && !STOP.test(body[start - 1]) && body[start - 1] !== "\n")
    start--;
  let end = idx;
  while (end < body.length && !STOP.test(body[end]) && body[end] !== "\n")
    end++;
  return body.slice(start, end);
}

function listFilesRecursive(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return out;
    throw err;
  }
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...listFilesRecursive(abs));
    } else if (e.isFile()) {
      const ext = extname(e.name).toLowerCase();
      // .svg can carry inline <style> blocks with @font-face / @import
      // pulling from CDN. Editorial site MAY ship illustrative SVG.
      if (ext === ".html" || ext === ".css" || ext === ".svg") out.push(abs);
    }
  }
  return out;
}

function main() {
  let stat;
  try {
    stat = statSync(DIST);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(
        `✗ verify-font-self-hosting: dist/ not found at ${DIST}. Run \`npm run build\` first.`,
      );
      exit(2);
    }
    console.error(
      `✗ verify-font-self-hosting: cannot stat ${DIST}: ${err.code ?? "unknown"}`,
    );
    exit(2);
  }
  if (!stat.isDirectory()) {
    console.error(`✗ verify-font-self-hosting: ${DIST} is not a directory`);
    exit(2);
  }

  const files = listFilesRecursive(DIST);
  const violations = [];
  const readErrors = [];
  for (const abs of files) {
    let body;
    try {
      body = readFileSync(abs, "utf8");
    } catch (err) {
      // Don't silently skip — surface the read error so a permissions
      // bug doesn't masquerade as "no violations" (the postbuild gate
      // exit-2 contract requires this).
      readErrors.push({
        path: relative(DIST, abs),
        code: err.code ?? "unknown",
        message: err.message,
      });
      continue;
    }
    HOST_RE.lastIndex = 0;
    let m;
    while ((m = HOST_RE.exec(body)) !== null) {
      const host = m[0];
      // Tier 2: generic CDN — only flag if the surrounding URL looks
      // font-shaped. Skips Algolia DocSearch JS/CSS via jsdelivr, etc.
      if (!FONT_HOSTS_SET.has(host)) {
        const url = urlAround(body, m.index);
        if (!FONT_PATH_RE.test(url)) continue;
      }
      const before = body.slice(0, m.index);
      const line = before.split("\n").length;
      violations.push({
        path: relative(DIST, abs),
        line,
        host,
      });
    }
  }

  if (readErrors.length > 0) {
    for (const e of readErrors) {
      console.error(
        `✗ verify-font-self-hosting: cannot read ${e.path}: ${e.code} ${e.message}`,
      );
    }
    console.error(
      `\n${readErrors.length} file(s) unreadable. Fix permissions and retry; do not interpret as "no violations".`,
    );
    exit(2);
  }

  if (violations.length === 0) {
    console.log(
      `✓ verify-font-self-hosting: no third-party font CDN references in ${relative(ROOT, DIST)}/ (${files.length} HTML/CSS files scanned).`,
    );
    exit(0);
  }

  for (const v of violations) {
    console.error(
      `✗ ${v.path}:${v.line} — third-party font CDN reference: ${v.host}`,
    );
  }
  console.error(
    `\n${violations.length} CDN font reference${violations.length === 1 ? "" : "s"} in built tree.`,
  );
  console.error(
    `  CSP font-src is locked to 'self' (scripts/csp.mjs). Self-host WOFF2 under public/assets/fonts/ (USMR Phase 2 task 2.3) before adding any third-party @font-face / <link> reference.`,
  );
  exit(1);
}

main();
