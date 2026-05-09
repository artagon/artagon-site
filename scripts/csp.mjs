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
function buildPolicy(hashes, extras = {}, styleHashes = new Set()) {
  const sHashes = [...hashes].map((h) => `'sha256-${h}'`);
  const stHashes = [...styleHashes].map((h) => `'sha256-${h}'`);
  const directives = {
    "default-src": ["'self'"],
    "img-src": ["'self'", "data:"],
    // pt432 — `'unsafe-inline'` removed from style-src; every inline
    // `<style>` block in built HTML is now SHA-256-hashed below
    // (mirrors the script-src hash-mode pattern). Pre-pt432 a CSS-
    // injection sink could exfil via `<style>{{user}}</style>` even
    // though Astro auto-escapes — defense-in-depth removes the
    // permission entirely. The 2026-05-09 security review (blackhat
    // lens) flagged this as a Minor exfil channel.
    "style-src": ["'self'", ...stHashes],
    // USMR Phase 2 (style-system §"CSP font-src is self-only"): self only,
    // no data: URIs and no third-party CDNs. The `self-host-woff2-fonts`
    // proposal (in flight per openspec/changes/) will finish the
    // self-hosted WOFF2 migration; until that change archives,
    // BaseLayout.astro still loads `fonts.googleapis.com` /
    // `fonts.gstatic.com` for the canonical 6-typeface set (via
    // `<link rel="stylesheet">`, NOT project-source `@font-face`).
    // The postbuild gate at scripts/verify-font-self-hosting.mjs fails
    // the build if any dist/**/*.{html,css} references a third-party
    // font CDN that this CSP would block at runtime — the gate's
    // current findings (Google Fonts refs in dist/) are tracked under
    // the `self-host-woff2-fonts` proposal as the open architectural
    // tension, not as a CI regression to fix in isolation.
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "frame-ancestors": ["'none'"],
    "script-src": ["'self'", ...sHashes],
  };
  // pt433 — defense-in-depth: filter forbidden CSP keywords out of
  // every `extras` value before the merge. Pre-pt433 a future caller
  // of `buildPolicy` (the function is exported for unit testing and
  // could be re-imported by other scripts) could pass
  // `extras["script-src"] = ["'unsafe-inline'"]` and the merge would
  // silently include it. Today `processHtml` is the only callsite
  // and `extras` is only populated by the hardcoded DocSearch branch
  // (safe), but the runtime orphan-detection guard would still throw
  // — making this a single-layer defense. Filtering here makes
  // `buildPolicy` itself refuse the dangerous tokens regardless of
  // what the caller passes, so a regression caused by adding a new
  // `extras`-populator can't bypass the check by short-circuiting
  // around `processHtml`. The 2026-05-09 pt432 verification (blackhat
  // lens) flagged this as a defense-in-depth gap on the exported
  // helper.
  const FORBIDDEN_KEYWORDS = new Set([
    "'unsafe-inline'",
    "'unsafe-eval'",
    "'unsafe-hashes'",
    "'wasm-unsafe-eval'",
  ]);
  // pt434 — case-insensitive match. Browsers parse CSP keywords
  // case-insensitively per CSP3 §6.6.2.1, so the filter must too —
  // otherwise `extras["script-src"] = ["'UNSAFE-INLINE'"]` would slip
  // past a case-sensitive Set lookup and the browser would still
  // honor the directive. Strip whitespace defensively too: tokens
  // are space-separated in the emitted directive, but a leading or
  // trailing space on an `extras` value would break the Set lookup
  // even though the rendered directive would still be unsafe (the
  // browser tokenizer ignores the surrounding whitespace).
  const isForbidden = (tok) =>
    typeof tok === "string" && FORBIDDEN_KEYWORDS.has(tok.trim().toLowerCase());
  for (const [k, v] of Object.entries(extras)) {
    const filtered = v.filter((tok) => !isForbidden(tok));
    directives[k] = [...(directives[k] || []), ...filtered];
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
  // pt432 — same hash-mode pattern for inline <style> blocks. Mirrors
  // the script handling above. A `<link rel="stylesheet" href="...">`
  // is matched separately (no inline content) and is not hashed; only
  // `<style>...</style>` content is hashed and added to style-src.
  const inlineStyles = $("style").toArray();
  const styleHashes = new Set();
  for (const el of inlineStyles) {
    const css = $(el).html() || "";
    styleHashes.add(sha(Buffer.from(css)));
  }
  const extras = {};
  const hasDoc =
    $('script[src*="docsearch"]').length || $('link[href*="docsearch"]').length;
  if (hasDoc) {
    // pt431 — path-pin the jsdelivr allow-list to /npm/@docsearch/.
    // Pre-pt431 the entire `https://cdn.jsdelivr.net` host was added
    // to script-src + style-src, so any package published on jsdelivr
    // would have been a viable script-src origin if it ever loaded
    // here. Path-prefix matching per CSP spec: the URL prefix must be
    // a complete path segment, so `cdn.jsdelivr.net/npm/@docsearch/`
    // matches `/npm/@docsearch/js@3.9.0` but rejects
    // `/npm/something-else@x`. Bumps to a different DocSearch path
    // require updating this too — kept atomic.
    extras["script-src"] = ["https://cdn.jsdelivr.net/npm/@docsearch/"];
    extras["style-src"] = ["https://cdn.jsdelivr.net/npm/@docsearch/"];
    extras["connect-src"] = [
      "https://*.algolia.net",
      "https://*.algolianet.com",
    ];
  }
  const policy = buildPolicy(hashes, extras, styleHashes);

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

  // pt432 — same orphan-hash detection for style-src.
  const styleSrcMatch = policy.match(/style-src\s+([^;]+)/);
  const styleSrcValues = styleSrcMatch
    ? styleSrcMatch[1].trim().split(/\s+/)
    : [];
  if (styleSrcValues.includes("'unsafe-inline'")) {
    throw new Error(
      `[CSP] ${rel}: 'unsafe-inline' found in style-src — forbidden by pt432`,
    );
  }
  for (const h of styleHashes) {
    if (!styleSrcValues.includes(`'sha256-${h}'`)) {
      throw new Error(
        `[CSP] ${rel}: inline style sha256-${h} not present in style-src — orphan hash`,
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

  // pt432 — same post-write self-audit for inline styles.
  const writtenStyleHashes = new Set();
  for (const el of $w("style").toArray()) {
    writtenStyleHashes.add(sha(Buffer.from($w(el).html() || "")));
  }
  const writtenStyleSrc = extractStyleSrcHashes(writtenPolicy);
  const writtenStyleOrphans = [...writtenStyleHashes].filter(
    (h) => !writtenStyleSrc.has(h),
  );
  if (writtenStyleOrphans.length) {
    throw new Error(
      `[CSP] post-write orphan inline-style hashes in ${path.relative(process.cwd(), fp)}: ${writtenStyleOrphans.join(", ")}`,
    );
  }
  return hashes.size + styleHashes.size;
}

function extractStyleSrcHashes(policy) {
  const m = /(?:^|;\s*)style-src\s+([^;]+)/.exec(policy);
  if (!m) return new Set();
  const set = new Set();
  for (const tok of m[1].trim().split(/\s+/)) {
    const h = /^'sha256-([^']+)'$/.exec(tok);
    if (h) set.add(h[1]);
  }
  return set;
}
// Export helpers for unit testing (tests/csp.test.mjs).
export { buildPolicy, extractScriptSrcHashes, extractStyleSrcHashes, sha };

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
