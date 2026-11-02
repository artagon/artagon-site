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
//     (the LHCI static server may also redirect directory paths).
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
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import type { Server } from "node:http";
import { BUILD } from "../build.config.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const ASTRO_CONFIG = join(ROOT, "astro.config.ts");
const LHCI_RC = join(ROOT, "lighthouserc.json");
const LHCI_FIXTURE = join(ROOT, "scripts", "fixtures", "lhci-assertions.json");
const README = join(ROOT, "README.md");
type LhciConfig = { ci: { collect: { staticDistDir: string; startServerCommand?: string; url: string[] }; upload: { target: string; outputDir: string } } };

// BUILD 1.1-1.2: validate documentation and route files without starting Chrome.
function assertReadme(body: string) {
  expect(body).toMatch(/ci\.collect\.staticDistDir[\s\S]{0,80}`\.build\/dist`/);
  expect(body).toContain("npx --no-install lhci autorun --config=lighthouserc.json");
  expect(body).toMatch(/scripts\/lhci-serve\.mjs` is an optional standalone local helper/);
  expect(body).not.toMatch(/(?:LHCI config|lighthouserc\.json)[^.]{0,80}(?:starts|runs|invokes|consumes)[^.]{0,80}scripts\/lhci-serve\.mjs/i);
  expect(body).not.toMatch(/(?:via|consumed by) `(?:scripts\/lhci-serve\.mjs|lighthouserc\.json)`/i);
}

function assertConfig(rc: LhciConfig, routes: string[]) {
  expect(rc.ci.collect.staticDistDir).toBe(BUILD.dist);
  expect(rc.ci.collect.startServerCommand).toBeUndefined();
  expect(rc.ci.collect.url).toEqual(routes);
  expect(rc.ci.upload).toMatchObject({ target: "filesystem", outputDir: BUILD.reports.lhci });
}

function assertWorkflow(body: string) {
  expect(body).not.toContain("scripts/lhci-serve.mjs");
}

function assertRoutes(dist: string, urls: string[]) {
  expect(existsSync(dist) && statSync(dist).isDirectory(), `missing staticDistDir: ${dist}`).toBe(true);
  for (const url of urls) {
    expect(url).toMatch(/^\/(?:[a-z0-9-]+)?$/);
    const route = url.slice(1);
    const candidates = route ? [join(dist, route, "index.html"), join(dist, `${route}.html`)] : [join(dist, "index.html")];
    expect(candidates.some((p) => existsSync(p) && statSync(p).isFile()), `missing built route: ${url}`).toBe(true);
  }
}

function assertReports(dir: string, routes: string[], notBefore = 0) {
  const manifest = join(dir, "manifest.json");
  expect(existsSync(manifest), `missing uploaded manifest: ${manifest}`).toBe(true);
  expect(statSync(manifest).mtimeMs, "stale manifest").toBeGreaterThanOrEqual(notBefore);
  const entries = JSON.parse(readFileSync(manifest, "utf8")) as Array<{ url: string; htmlPath: string; jsonPath: string }>;
  expect(Array.isArray(entries)).toBe(true);
  const seen = new Set<string>();
  const owners = new Map<string, string>();
  for (const entry of entries) {
    const route = new URL(entry.url).pathname;
    seen.add(route);
    for (const field of ["htmlPath", "jsonPath"] as const) {
      const file = resolve(entry[field]);
      const rel = relative(resolve(dir), file);
      expect(rel !== "" && rel !== ".." && !rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(rel)).toBe(true);
      expect(existsSync(file) && statSync(file).isFile() && statSync(file).size > 0, `missing ${field} for ${route}`).toBe(true);
      expect(statSync(file).mtimeMs, `stale ${field} for ${route}`).toBeGreaterThanOrEqual(notBefore);
      expect(owners.get(file) ?? route, `report reused across routes: ${file}`).toBe(route);
      owners.set(file, route);
    }
    const lhr = JSON.parse(readFileSync(resolve(entry.jsonPath), "utf8")) as { requestedUrl?: string };
    expect(lhr.requestedUrl).toBe(entry.url);
  }
  for (const route of routes) expect(seen.has(route), `missing report for ${route}`).toBe(true);
}

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

// BUILD 1.2: use LHCI's real server; directory requests can redirect before 200.
describe("LHCI static collection contract", () => {
  const rc = JSON.parse(readFileSync(LHCI_RC, "utf8")) as LhciConfig;
  const routes = ["/", "/platform", "/roadmap", "/vision", "/security", "/faq"];

  test("generated config and README describe the actual static server", () => {
    assertConfig(rc, routes);
    const workflow = readFileSync(join(ROOT, ".github/workflows/lighthouse.yml"), "utf8");
    assertWorkflow(workflow);
    expect(() => assertWorkflow(`${workflow}\nrun: node scripts/lhci-serve.mjs`)).toThrow();
    const body = readFileSync(README, "utf8");
    assertReadme(body);
    expect(() => assertReadme(body.replace("The generated `lighthouserc.json` uses", "The LHCI config starts `scripts/lhci-serve.mjs`. The generated `lighthouserc.json` uses"))).toThrow();
    expect(() => assertReadme(`${body}\nThe LHCI config starts\n\`scripts/lhci-serve.mjs\`.`)).toThrow();
    expect(() => assertConfig({ ...rc, ci: { ...rc.ci, collect: { ...rc.ci.collect, startServerCommand: "node server.js" } } }, routes)).toThrow();
  });

  test("all configured routes exist and a missing dist fails closed", () => {
    assertRoutes(join(ROOT, BUILD.dist), rc.ci.collect.url);
    const root = mkdtempSync(join(tmpdir(), "lhci-missing-dist-"));
    try { expect(() => assertRoutes(join(root, "absent"), routes)).toThrow(/missing staticDistDir/); }
    finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("LHCI FallbackServer serves each built route and rejects an unknown route", async () => {
    const require = createRequire(import.meta.url);
    const FallbackServer = require("@lhci/cli/src/collect/fallback-server.js") as new (root: string, spa: boolean) => { listen(): Promise<void>; close(): Promise<void>; port: number; _server?: Server };
    const server = new FallbackServer(resolve(ROOT, BUILD.dist), false);
    let onError: ((error: Error) => void) | undefined;
    try {
      const listening = server.listen();
      const failed = new Promise<never>((_, reject) => {
        onError = reject;
        server._server?.once("error", onError);
      });
      await Promise.race([listening, failed]);
      for (const route of routes) {
        const response = await fetch(`http://localhost:${server.port}${route}`);
        expect(response.status, route).toBe(200);
        expect((await response.text()).trim().length, route).toBeGreaterThan(0);
      }
      expect((await fetch(`http://localhost:${server.port}/not-a-real-route-5512`)).status).toBe(404);
    } finally {
      if (onError) server._server?.off("error", onError);
      if (server._server?.listening) await server.close();
    }
  }, 30_000);

  test("report checks fail for collect-only and missing report files", () => {
    const root = mkdtempSync(join(tmpdir(), "lhci-reports-"));
    try {
      expect(() => assertReports(root, routes)).toThrow(/missing uploaded manifest/);
      const entries = routes.map((route, index) => {
        const htmlPath = join(root, `${index}.html`);
        const jsonPath = join(root, `${index}.json`);
        const url = `http://localhost:1234${route}`;
        writeFileSync(htmlPath, "<html>report</html>");
        writeFileSync(jsonPath, JSON.stringify({ requestedUrl: url }));
        return { url, htmlPath, jsonPath };
      });
      writeFileSync(join(root, "manifest.json"), JSON.stringify(entries));
      assertReports(root, routes);
      expect(() => assertReports(root, routes, Date.now() + 60_000)).toThrow(/stale manifest/);
      writeFileSync(join(root, "manifest.json"), JSON.stringify(entries.map((entry, index) => index === 1 ? { ...entry, htmlPath: entries[0]!.htmlPath } : entry)));
      expect(() => assertReports(root, routes)).toThrow(/report reused across routes/);
      writeFileSync(join(root, "manifest.json"), JSON.stringify(entries));
      rmSync(entries[0]!.htmlPath);
      expect(() => assertReports(root, routes)).toThrow(/missing htmlPath/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test.runIf(process.env.LHCI_VERIFY_REPORTS === "1")("fresh CLI upload contains reports for every route", () => {
    const notBefore = Number(process.env.LHCI_REPORT_STARTED_AT);
    expect(Number.isFinite(notBefore) && notBefore > 0, "LHCI_REPORT_STARTED_AT must be the run's start time in milliseconds").toBe(true);
    assertReports(resolve(process.env.LHCI_REPORT_DIR ?? join(ROOT, BUILD.reports.lhci)), routes, notBefore);
  });
});
