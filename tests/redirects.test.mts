import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// USMR Phase 5.5.7 — `public/_redirects` rule contract. Astro's
// `npm run preview` is a static-file server and does NOT honor
// Cloudflare-Pages `_redirects` rules, so a Playwright spec wouldn't
// catch a typo locally — the rule only applies after deploy. This
// vitest gate parses the file directly, so a typo on the `/blog →
// /writing` 301 (added in 5.5) or a syntax break (a missing status
// code, a stray comment-as-rule line) fails CI before the deploy can
// silently route around the canonical writing index.

const HERE = dirname(fileURLToPath(import.meta.url));
const REDIRECTS_PATH = join(HERE, "..", "public", "_redirects");

interface Rule {
  /** Source pattern (path, possibly with `*` wildcard or `:placeholder`). */
  source: string;
  /** Destination URL or path (may use `:splat` for the wildcard). */
  destination: string;
  /** HTTP status code (Cloudflare canonical: bare 301; `301!` is Netlify-only). */
  status: number;
}

function parseRedirects(raw: string): Rule[] {
  const rules: Rule[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    // Cloudflare format: SOURCE  DESTINATION  STATUS
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      throw new Error(`Malformed redirect line: "${line}"`);
    }
    const [source, destination, status = "301"] = parts as [
      string,
      string,
      string?,
    ];
    const code = parseInt(status.replace("!", ""), 10);
    if (Number.isNaN(code)) {
      throw new Error(`Invalid status code "${status}" on line: ${line}`);
    }
    rules.push({ source, destination, status: code });
  }
  return rules;
}

const RULES = parseRedirects(readFileSync(REDIRECTS_PATH, "utf8"));

describe("public/_redirects — file shape", () => {
  test("file parses without errors", () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  test("every rule uses a permanent 301 status (not 302/308) on Cloudflare Pages", () => {
    // Per `migrate-deploy-to-cloudflare-pages` spec — bare `301` is the
    // canonical Cloudflare form (`301!` is Netlify-only). 302 and 308
    // are not used here.
    for (const rule of RULES) {
      expect(
        rule.status,
        `${rule.source} → ${rule.destination} status=${rule.status}`,
      ).toBe(301);
    }
  });
});

describe("public/_redirects — /blog → /writing 301 contract (5.5)", () => {
  function find(source: string): Rule | undefined {
    return RULES.find((r) => r.source === source);
  }

  test("`/blog` resolves to `/writing/`", () => {
    const rule = find("/blog");
    expect(rule, "/blog redirect rule").toBeDefined();
    expect(rule!.destination).toBe("/writing/");
    expect(rule!.status).toBe(301);
  });

  test("`/blog/` (trailing slash) also resolves to `/writing/`", () => {
    const rule = find("/blog/");
    expect(rule, "/blog/ redirect rule").toBeDefined();
    expect(rule!.destination).toBe("/writing/");
  });

  test("`/blog/*` slug splat propagates to `/writing/:splat`", () => {
    const rule = find("/blog/*");
    expect(rule, "/blog/* splat rule").toBeDefined();
    expect(rule!.destination).toBe("/writing/:splat");
  });
});

describe("public/_redirects — legacy /faqs alias (5.1)", () => {
  test("`/faqs` resolves to `/faq/`", () => {
    const rule = RULES.find((r) => r.source === "/faqs");
    expect(rule, "/faqs alias").toBeDefined();
    expect(rule!.destination).toBe("/faq/");
    expect(rule!.status).toBe(301);
  });
});

describe("public/_redirects — drift guards", () => {
  test("no /bridge → /platform#bridge legacy redirect (dropped in 5.2.8)", () => {
    // 5.2.8 turned /bridge into a real route; the 5.1q.3 redirect must
    // not regress (it would create a redirect loop or hide the new
    // page). Allow comments mentioning the dropped redirect.
    const live = RULES.find(
      (r) => r.source === "/bridge" || r.source === "/bridge/",
    );
    expect(
      live,
      "/bridge should resolve as a real Astro route, not a 301",
    ).toBeUndefined();
  });
});
