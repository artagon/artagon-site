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
  await fs.writeFile(fp, $.html(), "utf8");
  return hashes.size;
}
(async () => {
  const files = await walk(distDir);
  let count = 0;
  for (const f of files) count += await processHtml(f);
  console.log(`[CSP] files=${files.length} inline-hash-count=${count}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
