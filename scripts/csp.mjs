#!/usr/bin/env node
import { promises as fs, readFileSync } from "fs";
import path from "path";
import crypto from "crypto";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildConfig = JSON.parse(
  readFileSync(path.join(__dirname, "..", "build.config.json"), "utf8"),
);
const distDir = buildConfig.dist;
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("base64");
async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}
function buildPolicy(hashes, extras = {}) {
  const sHashes = [...hashes].map((h) => `'sha256-${h}'`);
  const directives = {
    "default-src": ["'self'"],
    "img-src": ["'self'", "data:"],
    "style-src": ["'self'", "'unsafe-inline'"],
    // USMR Phase 2 (style-system §"CSP font-src is self-only"): self only,
    // no data: URIs and no third-party CDNs. WOFF2 self-hosting (task 2.3)
    // is deferred to a follow-up; until then there are no @font-face
    // declarations, so this directive currently allows only the future
    // self-hosted WOFF2 set under /assets/fonts/. The postbuild gate at
    // scripts/verify-font-self-hosting.mjs fails the build if any
    // dist/**/*.html or dist/**/*.css references a third-party font CDN
    // (fonts.googleapis.com, etc.) that this CSP would block at runtime.
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "frame-ancestors": ["'none'"],
    "script-src": ["'self'", ...sHashes],
  };
  for (const [k, v] of Object.entries(extras)) {
    directives[k] = [...(directives[k] || []), ...v];
  }
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}
function extractScriptSrcHashes(policy) {
  const m = /(?:^|;\s*)script-src\s+([^;]+)/.exec(policy);
  if (!m) return new Set();
  const set = new Set();
  for (const tok of m[1].trim().split(/\s+/)) {
    const h = /^'sha256-([^']+)'$/.exec(tok);
    if (h) set.add(h[1]);
  }
  return set;
}

async function processHtml(fp) {
  const html = await fs.readFile(fp, "utf8");
  const $ = cheerio.load(html);
  const inline = $("script:not([src])").toArray();
  const hashes = new Set();
  for (const el of inline) {
    const code = $(el).html() || "";
    hashes.add(sha(Buffer.from(code)));
  }
  const extras = {};
  const hasDoc =
    $('script[src*="docsearch"]').length || $('link[href*="docsearch"]').length;
  if (hasDoc) {
    extras["script-src"] = ["https://cdn.jsdelivr.net"];
    extras["style-src"] = ["https://cdn.jsdelivr.net"];
    extras["connect-src"] = [
      "https://*.algolia.net",
      "https://*.algolianet.com",
    ];
  }
  const policy = buildPolicy(hashes, extras);

  // Orphan-hash detection (Phase 3.6): verify that the constructed script-src
  // covers every inline script and never contains 'unsafe-inline'.
  const scriptSrcMatch = policy.match(/script-src\s+([^;]+)/);
  const scriptSrcValues = scriptSrcMatch
    ? scriptSrcMatch[1].trim().split(/\s+/)
    : [];
  const rel = path.relative(distDir, fp);

  if (scriptSrcValues.includes("'unsafe-inline'")) {
    throw new Error(
      `[CSP] ${rel}: 'unsafe-inline' found in script-src — forbidden by Phase 3.6`,
    );
  }
  for (const h of hashes) {
    if (!scriptSrcValues.includes(`'sha256-${h}'`)) {
      throw new Error(
        `[CSP] ${rel}: inline script sha256-${h} not present in script-src — orphan hash`,
      );
    }
  }

  const existing = $('meta[http-equiv="Content-Security-Policy"]');
  if (existing.length) existing.attr("content", policy);
  else
    $("head").prepend(
      `<meta http-equiv="Content-Security-Policy" content="${policy}">`,
    );
  // 'unsafe-inline' must never appear in script-src (USMR
  // site-navigation §"Theme Toggle" — defence-in-depth even though
  // buildPolicy never emits it).
  if (/(^|;\s*)script-src\s[^;]*'unsafe-inline'/.test(policy)) {
    throw new Error(
      `[CSP] script-src contains 'unsafe-inline' in ${path.relative(process.cwd(), fp)}`,
    );
  }
  await fs.writeFile(fp, $.html(), "utf8");

  // Post-write self-audit: re-read the file from disk, extract every
  // inline-script hash, and compare against the meta's script-src.
  // Catches desync if a future cheerio version, future postbuild step,
  // or a bug in this script ever produces an inline <script> whose
  // SHA-256 isn't present in the emitted policy.
  const written = await fs.readFile(fp, "utf8");
  const $w = cheerio.load(written);
  const writtenHashes = new Set();
  for (const el of $w("script:not([src])").toArray()) {
    writtenHashes.add(sha(Buffer.from($w(el).html() || "")));
  }
  const writtenPolicy =
    $w('meta[http-equiv="Content-Security-Policy"]').attr("content") || "";
  const writtenScriptSrc = extractScriptSrcHashes(writtenPolicy);
  const writtenOrphans = [...writtenHashes].filter(
    (h) => !writtenScriptSrc.has(h),
  );
  if (writtenOrphans.length) {
    throw new Error(
      `[CSP] post-write orphan inline-script hashes in ${path.relative(process.cwd(), fp)}: ${writtenOrphans.join(", ")}`,
    );
  }
  return hashes.size;
}
// Export helpers for unit testing (tests/csp.test.mjs).
export { buildPolicy, extractScriptSrcHashes, sha };

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  (async () => {
    const files = await walk(distDir);
    let count = 0;
    for (const f of files) count += await processHtml(f);
    console.log(`[CSP] files=${files.length} inline-hash-count=${count}`);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
