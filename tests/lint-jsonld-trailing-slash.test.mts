// USMR Phase 5.5.16-pt152 — JSON-LD URL trailing-slash consistency.
//
// astro.config.ts sets `trailingSlash: "never"` — every internal
// URL in the built site should be in the canonical no-trailing-
// slash form. Pre-pt152 the WebSite SearchAction urlTemplate
// shipped `https://artagon.com/search/?q={search_term_string}`
// (trailing slash before the query string), so Google's site-search
// rich result would have followed an unnecessary 301 hop on every
// query AND the JSON-LD URL shape was inconsistent with the
// canonical / og:url / BreadcrumbList items in the same document.
//
// This gate scans every emitted JSON-LD block in
// `.build/dist/**/*.html` and asserts no internal URL ends with
// `/` immediately before a path segment terminator (other than the
// site root `https://artagon.com/`, which is canonical).
//
// Allow-list:
// - The site root form `https://artagon.com/` (Organization.url,
//   WebSite.url, BreadcrumbList Home item) — that's the canonical
//   home URL.
// - Per-line `<!-- lint-jsonld-trailing-slash: ok -->` HTML
//   comments before the JSON-LD <script> for any deliberate
//   exception.

import { describe, expect, test } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, ".build", "dist");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

interface Finding {
  file: string;
  url: string;
}

function findTrailingSlashUrls(json: unknown, acc: string[] = []): string[] {
  if (typeof json === "string") {
    // Match any internal Artagon URL with a non-canonical trailing slash.
    // The site-root form `https://artagon.com/` is allowed (it's the
    // canonical home URL). Any other URL with `/?` or trailing `/`
    // before end-of-string IS a violation.
    const m = json.match(/^https:\/\/artagon\.com(\/[^?#]*\/)([?#]|$)/);
    if (m && m[1] !== "/") {
      acc.push(json);
    }
    return acc;
  }
  if (Array.isArray(json)) {
    for (const item of json) findTrailingSlashUrls(item, acc);
    return acc;
  }
  if (json && typeof json === "object") {
    for (const v of Object.values(json)) findTrailingSlashUrls(v, acc);
  }
  return acc;
}

describe("JSON-LD URL trailing-slash consistency (pt152)", () => {
  test("no internal URL in built JSON-LD has a non-canonical trailing slash", () => {
    if (!existsSync(DIST)) {
      console.warn(
        `lint-jsonld-trailing-slash: ${DIST} not found; skipping (run \`npm run build\` first).`,
      );
      return;
    }
    const findings: Finding[] = [];
    const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    for (const file of walk(DIST)) {
      const html = readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(m[1]!);
        } catch {
          continue;
        }
        const urls = findTrailingSlashUrls(parsed);
        for (const url of urls) {
          findings.push({ file: relative(ROOT, file), url });
        }
      }
    }
    if (findings.length > 0) {
      const lines = findings.map((f) => `${f.file} — ${f.url}`).join("\n");
      throw new Error(
        `Found ${findings.length} JSON-LD URL${
          findings.length === 1 ? "" : "s"
        } with non-canonical trailing slash:\n${lines}\nFix: drop the trailing slash from the URL template.`,
      );
    }
    expect(findings.length).toBe(0);
  });
});
