#!/usr/bin/env node
/**
 * validate-indexation.mjs
 *
 * USMR Phase 10.7: CI gate that validates the indexation contract.
 *
 * THREE checks:
 *
 *   (A) meta-robots parity — routes in NOINDEX_ROUTES MUST include
 *       `noindex`; routes NOT in NOINDEX_ROUTES MUST NOT include it.
 *       The spec additionally requires `nofollow` on /console,
 *       /search, /play, and /404 only. Other noindex routes may use
 *       BaseLayout's documented `noindex, follow` override.
 *
 *   (B) sitemap lastmod parity — every writing URL MUST have a
 *       `<lastmod>` equal to its content frontmatter `updated`
 *       (falling back to `published`). Other sitemap URLs may omit
 *       `<lastmod>`. An empty or unrecognized sitemap fails closed.
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
import * as cheerio from "cheerio";
import { isNoindexRoute, NOINDEX_ROUTES } from "../src/lib/indexation.ts";
import { readWritingLastmod } from "../src/lib/writing-lastmod.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(argv[2] ? argv[2] : join(__dirname, ".."));

const DIST = join(ROOT, ".build", "dist");
const SITEMAP_PATH = join(DIST, "sitemap-0.xml");
const REDIRECTS_PATH = join(ROOT, "public", "_redirects");
// USMR 14.23 (site-2m1.23): these four routes are the only routes for
// which the live indexation spec requires both noindex and nofollow.
const NOFOLLOW_ROUTES = new Set(["/console", "/search", "/play", "/404"]);

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
    const $ = cheerio.load(body);
    const robots = $("meta")
      .toArray()
      .filter((element) => ($(element).attr("name") ?? "").toLowerCase() === "robots");
    const content = robots
      .map((element) => $(element).attr("content") ?? "")
      .join(", ");
    const tokens = new Set(content.toLowerCase().split(/[\s,]+/).filter(Boolean));
    const expected = isNoindexRoute(route);
    if (expected) {
      if (robots.length === 0) {
        findings.push({
          route,
          file: relative(ROOT, file),
          issue: "missing-robots-meta",
          detail:
            'route is in NOINDEX_ROUTES but no `<meta name="robots">` was emitted',
        });
      } else if (!tokens.has("noindex")) {
        findings.push({
          route,
          file: relative(ROOT, file),
          issue: "wrong-robots-content",
          detail: `route is in NOINDEX_ROUTES but emitted \`${content}\` instead of including "noindex"`,
        });
      } else if (NOFOLLOW_ROUTES.has(route) && !tokens.has("nofollow")) {
        findings.push({
          route,
          file: relative(ROOT, file),
          issue: "missing-nofollow",
          detail: `route requires both noindex and nofollow but emitted \`${content}\``,
        });
      }
    } else {
      if (tokens.has("noindex")) {
        findings.push({
          route,
          file: relative(ROOT, file),
          issue: "spurious-robots-meta",
          detail: `route is NOT in NOINDEX_ROUTES but emitted \`${content}\` (likely a stale hand-set robots prop)`,
        });
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ */
/* Check B: sitemap lastmod parity                                    */
/* ------------------------------------------------------------------ */

function parseSitemap(body) {
  const $ = cheerio.load(body, { xml: true });
  const urls = $("urlset > url")
    .toArray()
    .map((element) => ({
      loc: $(element).children("loc").first().text().trim(),
      lastmod: $(element).children("lastmod").first().text().trim() || null,
    }));
  // USMR 14.24 (site-2m1.24): Cheerio recovers from truncated XML.
  // Require a closed urlset and matching URL tags so partial input
  // cannot leave a valid prefix that makes sitemap checks pass.
  const openUrlTags = (body.match(/<url\s*>/g) ?? []).length;
  const closeUrlTags = (body.match(/<\/url\s*>/g) ?? []).length;
  if (
    !body.trimEnd().endsWith("</urlset>") ||
    openUrlTags !== closeUrlTags ||
    closeUrlTags !== urls.length
  ) {
    return {
      urls,
      error: `sitemap-0.xml has unclosed structure (url tags: ${openUrlTags} open, ${closeUrlTags} closed, ${urls.length} parsed)`,
    };
  }
  return { urls, error: null };
}

function isPathWithin(root, candidate) {
  const contentRelative = relative(root, candidate);
  return (
    contentRelative !== ".." &&
    !contentRelative.startsWith(`..${sep}`) &&
    !contentRelative.startsWith(sep)
  );
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
  const { urls, error } = parseSitemap(body);
  if (error) {
    return [{ issue: "invalid-sitemap-xml", detail: error }];
  }
  // USMR 14.24 (site-2m1.24): parser drift or an empty sitemap must
  // not turn the only lastmod check into a vacuous success.
  if (urls.length === 0) {
    return [
      {
        issue: "empty-sitemap",
        detail: "No sitemap URL entries parsed from sitemap-0.xml",
      },
    ];
  }
  const findings = [];
  for (const { loc, lastmod } of urls) {
    if (!loc) {
      findings.push({
        issue: "empty-sitemap-location",
        detail: "A sitemap URL entry has no <loc> value",
      });
      continue;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(loc).pathname);
    } catch {
      findings.push({
        loc,
        issue: "invalid-sitemap-location",
        detail: `Sitemap <loc>${loc}</loc> is not a valid absolute URL`,
      });
      continue;
    }
    // USMR 14.24 (site-2m1.24): support nested content IDs and both
    // collection extensions instead of assuming one flat .mdx slug.
    const m = pathname.match(/^\/writing\/(.+?)\/?$/);
    if (!m) continue; // only writing routes have MDX frontmatter we can parity-check
    const slug = m[1];
    if (!lastmod) {
      findings.push({
        loc,
        issue: "missing-lastmod",
        detail: "Writing URL lacks its required frontmatter lastmod",
      });
      continue;
    }
    const writingRoot = resolve(ROOT, "src", "content", "writing");
    const segments = slug.split("/");
    if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
      findings.push({
        loc,
        issue: "invalid-writing-path",
        detail: "Writing URL does not map to a safe content path",
      });
      continue;
    }
    const contentBase = resolve(writingRoot, ...segments);
    const contentCandidates = isPathWithin(writingRoot, contentBase)
      ? [`${contentBase}.md`, `${contentBase}.mdx`]
      : [];
    const contentPath = contentCandidates.find((candidate) => existsSync(candidate));
    if (!contentPath) {
      findings.push({
        loc,
        issue: "sitemap-url-without-writing-content",
        detail: `sitemap cites <loc>${loc}</loc> but no .md or .mdx content file under ${relative(ROOT, writingRoot)}`,
      });
      continue;
    }
    const expected = readWritingLastmod(slug, writingRoot);
    if (!expected) {
      findings.push({
        loc,
        issue: "writing-content-without-date",
        detail: `Writing content at ${relative(
          ROOT,
          contentPath,
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
        detail: `sitemap <lastmod>${lastmod}</lastmod> does not match parsed writing frontmatter lastmod (${expected})`,
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
