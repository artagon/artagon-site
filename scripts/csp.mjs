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
    //
    // pt444 — `https://fonts.googleapis.com` allow-listed for
    // `<link rel="stylesheet">` requests until `self-host-woff2-fonts`
    // archives. Without this the canonical Google Fonts CSS at
    // `BaseLayout.astro:104` is blocked → Space Grotesk / Inter Tight
    // don't load → the webfonts test fails. Same proposal-in-flight
    // exception pattern as `verify-font-self-hosting.mjs:199-215`
    // (pt441). After the proposal archives, fonts move under
    // `public/assets/fonts/` and self-host kills this allow-list.
    "style-src": ["'self'", ...stHashes, "https://fonts.googleapis.com"],
    // pt444 — inline `style="..."` attributes need their own
    // directive (`style-src-attr` per CSP3 §6.6.2.6). pt432 closed
    // the `<style>` block exfil channel but inadvertently also
    // blocked all inline `style="..."` attribute usage, which Astro
    // and many MDX-rendered components emit (`hero-section h1
    // style="--grid-min-width: 280px"`, etc). The exfil surface for
    // attribute-only is much smaller than `<style>` blocks (an
    // attacker who can inject HTML can already inject `<script>`).
    // Allow `'unsafe-inline'` on `style-src-attr` as a separate
    // directive; `<style>` block strict mode is unaffected.
    "style-src-attr": ["'unsafe-inline'"],
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
    // pt444 — `https://fonts.gstatic.com` allow-listed for the
    // actual woff2 font files until `self-host-woff2-fonts`
    // archives. Same rationale as the `style-src` Google Fonts
    // exception above. The font-self-hosting gate
    // (`scripts/verify-font-self-hosting.mjs`, warn-only per
    // pt441) tracks the migration; both come down together when
    // the proposal lands and the woff2 files move under
    // `public/assets/fonts/`.
    "font-src": ["'self'", "https://fonts.gstatic.com"],
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
  // pt435 — drop non-string tokens entirely. Pre-pt435 a buggy caller
  // passing `null` / `undefined` / numbers would have those values
  // join-stringified into the rendered directive as invalid CSP
  // source-expressions (browsers ignore them, but they pollute the
  // policy text and would mask a real regression in CI logs and
  // reviewer reads). Explicitly dropping non-strings means the
  // emitted directive contains only well-formed source-expressions,
  // regardless of caller correctness.
  for (const [k, v] of Object.entries(extras)) {
    // pt444 — array guard. Pre-pt444 a caller passing
    // `extras = { "script-src": "https://x" }` (string instead of
    // array) crashed with `TypeError: v.filter is not a function`.
    // The pt435 narrative claimed defense-in-depth against malformed
    // callers but didn't cover non-array values. Skip non-arrays
    // (treat as no-op) so a single typo in the only callsite at
    // line 88 — or any future callsite — doesn't crash the
    // postbuild gate. Code-reviewer (2026-05-09 multi-agent review)
    // flagged this as a Minor gap.
    if (!Array.isArray(v)) continue;
    const filtered = v.filter(
      (tok) => typeof tok === "string" && !isForbidden(tok),
    );
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
