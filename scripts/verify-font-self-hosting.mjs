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

// Hosts whose presence in dist/ HTML/CSS implies a CDN font load that
// strict CSP `font-src 'self'` will block. The list is conservative —
// we only flag well-known font CDNs; arbitrary http(s) URLs in body
// content are out of scope.
const FORBIDDEN_HOSTS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "use.typekit.net",
  "p.typekit.net",
  "fast.fonts.net",
  "kit.fontawesome.com",
  "ka-f.fontawesome.com",
];

const HOST_RE = new RegExp(
  FORBIDDEN_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|"),
  "g",
);

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
      if (ext === ".html" || ext === ".css") out.push(abs);
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
  for (const abs of files) {
    let body;
    try {
      body = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    HOST_RE.lastIndex = 0;
    let m;
    while ((m = HOST_RE.exec(body)) !== null) {
      const before = body.slice(0, m.index);
      const line = before.split("\n").length;
      violations.push({
        path: relative(DIST, abs),
        line,
        host: m[0],
      });
    }
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
