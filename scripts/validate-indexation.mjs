#!/usr/bin/env node
/**
 * validate-indexation.mjs
 *
 * USMR Phase 10.7: CI gate that validates the indexation contract.
 *
 * THREE checks:
 *
 *   (A) meta-robots parity — every built HTML page under
 *       `.build/dist/` MUST have `<meta name="robots" content="noindex,
 *       nofollow">` iff its route is in NOINDEX_ROUTES (per
 *       `src/lib/indexation.ts` SSoT, pt416). Routes NOT in
 *       NOINDEX_ROUTES MUST NOT emit a robots meta. This catches
 *       drift in two directions: a noindex route losing its meta
 *       (e.g. via a hand-edited `<Base>` prop), AND an indexable
 *       route accidentally getting one (e.g. via a typo'd path
 *       prop that triggers `isNoindexRoute('/privacy/something')`
 *       falsely).
 *
 *   (B) sitemap lastmod parity — every URL in `sitemap-0.xml` that
 *       carries a `<lastmod>` MUST equal the MDX frontmatter
 *       `updated` (falling back to `published` if `updated`
 *       absent). Sitemap URLs without `<lastmod>` are skipped —
 *       Phase 10.1 (`@astrojs/sitemap` `serialize` hook) wires the
 *       date emission; until that ships this check is vacuously
 *       satisfied (no lastmod present → nothing to validate). The
 *       hook IS the consumer that makes this check load-bearing;
 *       both ship in close lockstep.
 *
 *   (C) `_redirects` same-origin — every destination in
 *       `public/_redirects` MUST begin with `/` (relative to site
 *       root) and MUST NOT contain `://` (no absolute URLs) or
 *       begin with `//` (no protocol-relative). Same-origin
 *       redirects keep the trailingSlash="never" canonical
 *       contract intact AND prevent open-redirect risk.
 *
 * Wire into postbuild AFTER `astro build` (the dist/ tree must
 * exist to run check A).
 *
 * Exit codes:
 *   0 — all three checks pass
 *   1 — at least one check failed (specific findings printed to
 *       stderr; root cause + fix path included with each)
 *   2 — usage error (missing dist/, missing _redirects, etc.)
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";
import { isNoindexRoute, NOINDEX_ROUTES } from "../src/lib/indexation.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(argv[2] ? argv[2] : join(__dirname, ".."));

const DIST = join(ROOT, ".build", "dist");
const SITEMAP_PATH = join(DIST, "sitemap-0.xml");
const REDIRECTS_PATH = join(ROOT, "public", "_redirects");

/* ------------------------------------------------------------------ */
/* Check A: meta-robots parity                                        */
/* ------------------------------------------------------------------ */

function listHtmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) listHtmlFiles(full, out);
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

/**
 * Translate a `.build/dist/...` path into its route path.
 * Examples:
 *   .build/dist/index.html         → /
 *   .build/dist/404.html           → /404
 *   .build/dist/privacy/index.html → /privacy
 *   .build/dist/writing/foo/index.html → /writing/foo
 */
function distFileToRoute(distFile) {
  const rel = relative(DIST, distFile).split(sep).join("/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html"))
    return "/" + rel.slice(0, -"/index.html".length);
  // Root-level non-index pages (e.g. 404.html). Strip `.html`.
  if (!rel.includes("/") && rel.endsWith(".html"))
    return "/" + rel.slice(0, -".html".length);
  // Other deep-nested .html files (rare). Strip `.html`.
  return "/" + rel.slice(0, -".html".length);
}

const ROBOTS_META_RE =
  /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']\s*\/?>/i;

function checkA() {
  if (!existsSync(DIST)) {
    return {
      kind: "usage",
      message: `✗ .build/dist/ not found at ${DIST}. Run \`npm run build\` first; this gate validates the built output.`,
    };
  }
  const findings = [];
  for (const file of listHtmlFiles(DIST)) {
    const route = distFileToRoute(file);
    const body = readFileSync(file, "utf8");
    const match = body.match(ROBOTS_META_RE);
    const expected = isNoindexRoute(route);
    if (expected) {
      if (!match) {
        findings.push({
          route,
          file: relative(ROOT, file),
          issue: "missing-robots-meta",
          detail:
            'route is in NOINDEX_ROUTES but no `<meta name="robots">` was emitted',
        });
      } else if (!/\bnoindex\b/i.test(match[1])) {
        findings.push({
          route,
          file: relative(ROOT, file),
          issue: "wrong-robots-content",
          detail: `route is in NOINDEX_ROUTES but emitted \`${match[1]}\` instead of including "noindex"`,
        });
      }
    } else {
      if (match && /\bnoindex\b/i.test(match[1])) {
        findings.push({
          route,
          file: relative(ROOT, file),
          issue: "spurious-robots-meta",
          detail: `route is NOT in NOINDEX_ROUTES but emitted \`${match[1]}\` (likely a stale hand-set robots prop)`,
        });
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Check B: sitemap lastmod parity                                    */
/* ------------------------------------------------------------------ */

const SITEMAP_URL_RE =
  /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?\s*<\/url>/g;

function parseSitemap(body) {
  const urls = [];
  for (const m of body.matchAll(SITEMAP_URL_RE)) {
    urls.push({ loc: m[1], lastmod: m[2] ?? null });
  }
  return urls;
}

function frontmatterDate(mdxBody, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const m = mdxBody.match(re);
  if (!m) return null;
  // Strip surrounding quotes if present.
  return m[1].trim().replace(/^['"]|['"]$/g, "");
}

function checkB() {
  if (!existsSync(SITEMAP_PATH)) {
    return [
      {
        issue: "missing-sitemap",
        detail: `sitemap-0.xml not found at ${SITEMAP_PATH}. Did the build run?`,
      },
    ];
  }
  const body = readFileSync(SITEMAP_PATH, "utf8");
  const urls = parseSitemap(body);
  const findings = [];
  for (const { loc, lastmod } of urls) {
    if (!lastmod) continue; // Phase 10.1 unshipped → vacuously OK
    // Derive the writing slug if this is a /writing/<slug> URL.
    const m = loc.match(/\/writing\/([^/]+)$/);
    if (!m) continue; // only writing routes have MDX frontmatter we can parity-check
    const slug = m[1];
    const mdxPath = join(ROOT, "src", "content", "writing", `${slug}.mdx`);
    if (!existsSync(mdxPath)) {
      findings.push({
        loc,
        issue: "sitemap-url-without-mdx",
        detail: `sitemap cites <loc>${loc}</loc> but no MDX file at ${relative(
          ROOT,
          mdxPath,
        )}`,
      });
      continue;
    }
    const mdxBody = readFileSync(mdxPath, "utf8");
    const updated = frontmatterDate(mdxBody, "updated");
    const published = frontmatterDate(mdxBody, "published");
    const expected = updated ?? published;
    if (!expected) {
      findings.push({
        loc,
        issue: "mdx-without-date",
        detail: `MDX at ${relative(
          ROOT,
          mdxPath,
        )} has neither \`updated\` nor \`published\` frontmatter`,
      });
      continue;
    }
    // Normalize both sides to ISO date prefix (YYYY-MM-DD) for comparison —
    // sitemap may emit full ISO timestamps, frontmatter may be date-only.
    const sitemapDate = lastmod.slice(0, 10);
    const expectedDate = expected.slice(0, 10);
    if (sitemapDate !== expectedDate) {
      findings.push({
        loc,
        issue: "lastmod-parity",
        detail: `sitemap <lastmod>${lastmod}</lastmod> does not match MDX frontmatter (${
          updated ? "updated" : "published"
        }=${expected})`,
      });
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Check C: _redirects same-origin                                    */
/* ------------------------------------------------------------------ */

function checkC() {
  if (!existsSync(REDIRECTS_PATH)) {
    return [
      {
        issue: "missing-redirects",
        detail: `${REDIRECTS_PATH} not found.`,
      },
    ];
  }
  const body = readFileSync(REDIRECTS_PATH, "utf8");
  const findings = [];
  let lineno = 0;
  for (const rawLine of body.split("\n")) {
    lineno++;
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    // _redirects format: <source> <destination> [status]
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue; // malformed — skip silently here; Cloudflare will reject at deploy
    const dest = parts[1];
    // pt430 — additional same-origin guards beyond `://` / `//` / non-`/`.
    // Pre-pt430 the gate accepted backslash-prefixed paths (`/\evil.com`,
    // which some browsers normalize to `//evil.com`) and control-char
    // injections (`\x00-\x1f` / `\x7f`) that could break out of the
    // routing context on edge runtimes. Cloudflare Pages parses
    // `_redirects` strictly so most edge cases fail closed today, but
    // tightening upstream stops reliance on unspecified downstream
    // parser behavior. See 2026-05-09 security review (blackhat lens).
    if (dest.includes("://")) {
      findings.push({
        line: lineno,
        rule: line,
        issue: "absolute-url",
        detail: `destination "${dest}" contains "://" (absolute URL); same-origin only`,
      });
    } else if (dest.startsWith("//")) {
      findings.push({
        line: lineno,
        rule: line,
        issue: "protocol-relative",
        detail: `destination "${dest}" begins with "//" (protocol-relative); same-origin only`,
      });
    } else if (dest.startsWith("/\\") || dest.includes("\\")) {
      findings.push({
        line: lineno,
        rule: line,
        issue: "backslash",
        detail: `destination "${dest}" contains a backslash; some browsers normalize "/\\foo" to "//foo" (protocol-relative pivot)`,
      });
    } else if (/[\x00-\x1f\x7f]/.test(dest)) {
      findings.push({
        line: lineno,
        rule: line,
        issue: "control-char",
        detail: `destination "${dest}" contains a control character (U+0000-U+001F or U+007F); reject before any downstream parser sees it`,
      });
    } else if (!dest.startsWith("/")) {
      findings.push({
        line: lineno,
        rule: line,
        issue: "non-rooted",
        detail: `destination "${dest}" does not begin with "/"; same-origin destinations must be site-rooted`,
      });
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Driver                                                             */
/* ------------------------------------------------------------------ */

function main() {
  let usageError = null;
  let aFindings = [];
  let bFindings = [];
  let cFindings = [];

  const aResult = checkA();
  if (Array.isArray(aResult)) aFindings = aResult;
  else usageError = aResult.message;

  if (!usageError) {
    bFindings = checkB();
    cFindings = checkC();
  }

  if (usageError) {
    console.error(usageError);
    exit(2);
  }

  const total = aFindings.length + bFindings.length + cFindings.length;
  if (total === 0) {
    console.log(
      `✓ validate-indexation OK (NOINDEX_ROUTES: ${NOINDEX_ROUTES.length} routes; meta-robots parity ✓ · lastmod parity ✓ · _redirects same-origin ✓)`,
    );
    exit(0);
  }

  console.error(`✗ validate-indexation: ${total} finding(s).`);
  if (aFindings.length > 0) {
    console.error(`\n  Check A — meta-robots parity (${aFindings.length}):`);
    for (const f of aFindings) {
      console.error(`    [${f.issue}] ${f.route}`);
      console.error(`      file: ${f.file}`);
      console.error(`      ${f.detail}`);
    }
  }
  if (bFindings.length > 0) {
    console.error(
      `\n  Check B — sitemap lastmod parity (${bFindings.length}):`,
    );
    for (const f of bFindings) {
      console.error(`    [${f.issue}] ${f.loc ?? f.detail}`);
      if (f.loc) console.error(`      ${f.detail}`);
    }
  }
  if (cFindings.length > 0) {
    console.error(
      `\n  Check C — _redirects same-origin (${cFindings.length}):`,
    );
    for (const f of cFindings) {
      console.error(`    [${f.issue}] line ${f.line}: ${f.rule ?? f.detail}`);
      if (f.rule) console.error(`      ${f.detail}`);
    }
  }
  console.error(
    "\n  Fix path:\n" +
      "    1. For Check A misses: ensure NOINDEX_ROUTES (src/lib/indexation.ts) lists the route AND the per-page <Base> doesn't carry a stale `robots` prop that overrides BaseLayout's auto-derivation.\n" +
      "    2. For Check B misses: align the MDX frontmatter (`updated` or `published`) with the sitemap's <lastmod> serializer hook output (Phase 10.1).\n" +
      "    3. For Check C misses: rewrite the destination to a site-rooted path (e.g. `/platform` instead of `https://artagon.com/platform`).\n",
  );
  exit(1);
}

main();
