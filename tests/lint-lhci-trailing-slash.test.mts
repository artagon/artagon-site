// USMR Phase 5.5.16-pt195 — LHCI URL trailing-slash vs astro.config.ts
// `trailingSlash: "never"` sync gate.
//
// `astro.config.ts` declares `trailingSlash: "never"` — the
// canonical URL form for every site route omits the trailing
// slash (`/platform`, NOT `/platform/`). The deployed site
// 301-redirects `/foo/` → `/foo` for any non-root path.
//
// LHCI's `collect.url` array (sourced from
// `scripts/fixtures/lhci-assertions.json` and copied verbatim
// into the generated `lighthouserc.json` by
// `scripts/sync-build-config.mjs`) MUST follow the same
// canonicalization. Otherwise CI benchmarks a URL form that:
//   - Production users never hit (canonicalization rewrites
//     them to the no-trailing-slash form).
//   - Includes 301-redirect overhead in real-world delivery
//     (LHCI staticDistDir mode skips this; future LHCI runs
//     against the live deployment would NOT).
//
// Pre-pt195 the fixture shipped:
//   `["/", "/platform/", "/roadmap/", "/vision/", "/security/",
//    "/faq/"]`
// 5 of 6 had trailing slashes — 5 non-canonical URL forms in
// the benchmark. Same documentation-vs-implementation drift
// class as pt157 (redirects pointing at /faq/ → /faq instead
// of canonical /faq), pt193 (CI Node version vs `.nvmrc`),
// pt183 (`verify:design-md-telemetry` claimed CI-wired but
// wasn't).
//
// pt195 dropped the trailing slashes from the fixture, ran
// `npm run sync:build-config` to flow the change to
// `lighthouserc.json`, and locks the contract here. The gate
// asserts:
//   - The root path `/` is allowed (it's the index, not a
//     subpath; trailing slashes don't apply).
//   - Every non-root URL in `lighthouserc.json` `ci.collect.url`
//     and the source fixture MUST NOT end with `/`.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ASTRO_CONFIG = join(ROOT, "astro.config.ts");
const LHCI_RC = join(ROOT, "lighthouserc.json");
const LHCI_FIXTURE = join(ROOT, "scripts", "fixtures", "lhci-assertions.json");

describe("LHCI URLs vs astro.config trailingSlash (pt195)", () => {
  test('astro.config.ts declares trailingSlash: "never"', () => {
    expect(existsSync(ASTRO_CONFIG), "astro.config.ts must exist").toBe(true);
    const body = readFileSync(ASTRO_CONFIG, "utf8");
    expect(body, 'astro.config.ts must declare trailingSlash: "never"').toMatch(
      /trailingSlash\s*:\s*["']never["']/,
    );
  });

  test("lighthouserc.json non-root URLs have no trailing slash", () => {
    expect(existsSync(LHCI_RC), "lighthouserc.json must exist").toBe(true);
    const rc = JSON.parse(readFileSync(LHCI_RC, "utf8"));
    const urls: string[] = rc?.ci?.collect?.url ?? [];
    expect(
      urls.length,
      "lighthouserc.json must declare at least one collect URL",
    ).toBeGreaterThan(0);

    const drifts = urls.filter((u) => u !== "/" && u.endsWith("/"));
    if (drifts.length > 0) {
      throw new Error(
        `lighthouserc.json benchmarks ${drifts.length} URL(s) with trailing slashes that contradict astro.config.ts trailingSlash:"never":\n` +
          drifts.map((u) => `  - ${u}`).join("\n") +
          `\nFix: drop trailing slashes from scripts/fixtures/lhci-assertions.json then run \`npm run sync:build-config\` to regenerate lighthouserc.json.`,
      );
    }
    expect(drifts.length).toBe(0);
  });

  test("scripts/fixtures/lhci-assertions.json source-of-truth matches", () => {
    expect(existsSync(LHCI_FIXTURE), "LHCI fixture must exist").toBe(true);
    const fixture = JSON.parse(readFileSync(LHCI_FIXTURE, "utf8"));
    const urls: string[] = fixture?.urls ?? [];
    expect(
      urls.length,
      "LHCI fixture must declare at least one URL",
    ).toBeGreaterThan(0);

    const drifts = urls.filter((u) => u !== "/" && u.endsWith("/"));
    if (drifts.length > 0) {
      throw new Error(
        `scripts/fixtures/lhci-assertions.json declares ${drifts.length} URL(s) with trailing slashes that contradict astro.config.ts trailingSlash:"never":\n` +
          drifts.map((u) => `  - ${u}`).join("\n") +
          `\nFix: drop trailing slashes (the fixture is the source of truth; lighthouserc.json regenerates from it).`,
      );
    }
    expect(drifts.length).toBe(0);
  });
});
