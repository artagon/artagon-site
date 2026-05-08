// USMR Phase 5.5.16-pt193 — CI workflow Node version vs `.nvmrc`
// sync gate.
//
// `.nvmrc` declares the canonical Node major version for the
// project (currently `22.12`). Every `actions/setup-node`
// invocation in `.github/workflows/**/*.yml` MUST agree on the
// MAJOR version — otherwise CI builds against a different
// runtime than local dev, and bugs that only manifest under one
// Node major (ESM resolution, `node:test` flags, fetch behavior)
// silently slip through.
//
// Pre-pt193 the workflow files used:
//   - 22 — `playwright.yml` (×3), `design-md-pr-diff.yml`,
//     `design-md-lint.yml`, `deploy.yml`, `design-md-drift.yml`,
//     `lighthouse.yml`
//   - 20 — `release.yml` (DRIFT — pinned Node 20 while the rest
//     of CI ran 22)
//   - `lts/*` — `copilot-setup-steps.yml` (LTS-floating; allowed
//     by the gate as an explicit "track LTS" choice)
//
// Bug surface: a release built on Node 20 could resolve packages
// differently from local dev on Node 22 (e.g. native ESM
// extension behavior, `import attributes` syntax availability,
// `node:test` flag set). Releases would silently behave
// differently from PR-validated bundles.
//
// Same documentation-vs-implementation drift class as pt175
// (AGENTS.md ast-grep table missing rows), pt183 (npm-script
// callers — `verify:design-md-telemetry` claimed to run in CI
// but didn't), pt184 (Symbolic-references table). Different
// surface (CI YAML vs project config) but same shape: one source
// of truth contradicts another.
//
// pt193 corrected `release.yml` to Node 22 and locks the
// contract here. Tolerance:
//   - Numeric majors (`22`, `"22"`) MUST match `.nvmrc`'s major.
//   - String LTS markers (`"lts/*"`) are allowed (explicit
//     opt-in to LTS-floating).
//   - Specific minor pins (`"22.12"` vs `22`) are tolerated as
//     long as the major matches.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const NVMRC = join(ROOT, ".nvmrc");
const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");

function readNvmrcMajor(): string {
  const raw = readFileSync(NVMRC, "utf8").trim();
  // `.nvmrc` may be `22`, `22.12`, `v22`, `v22.12`, etc.
  const m = raw.match(/^v?(\d+)(?:\.\d+)*$/);
  if (!m) throw new Error(`.nvmrc unrecognized format: ${JSON.stringify(raw)}`);
  return m[1]!;
}

describe("CI workflow Node versions vs .nvmrc (pt193)", () => {
  test("every actions/setup-node node-version pin matches .nvmrc major (or is an LTS marker)", () => {
    expect(existsSync(NVMRC), ".nvmrc must exist").toBe(true);
    expect(existsSync(WORKFLOWS_DIR), ".github/workflows/ must exist").toBe(
      true,
    );
    const expectedMajor = readNvmrcMajor();
    expect(expectedMajor, ".nvmrc must declare a numeric Node major").toMatch(
      /^\d+$/,
    );

    const drifts: { file: string; cited: string }[] = [];

    for (const entry of readdirSync(WORKFLOWS_DIR, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!/\.(yml|yaml)$/.test(entry.name)) continue;
      const path = join(WORKFLOWS_DIR, entry.name);
      const body = readFileSync(path, "utf8");
      // Match `node-version: X` (with optional quotes; `X` is a
      // numeric version, a numeric.minor, or an LTS marker).
      // Examples: `node-version: 22`, `node-version: "22"`,
      // `node-version: 22.12`, `node-version: "lts/*"`.
      for (const m of body.matchAll(
        /node-version\s*:\s*["']?([^"'\s,}\n]+)["']?/g,
      )) {
        const cited = m[1]!;
        // LTS markers are explicit opt-in; allow.
        if (/^lts\//.test(cited)) continue;
        // Numeric major (with optional minor/patch).
        const major = cited.match(/^v?(\d+)(?:\.\d+)*$/);
        if (!major) {
          // Some unknown form — flag it.
          drifts.push({ file: entry.name, cited });
          continue;
        }
        if (major[1] !== expectedMajor) {
          drifts.push({ file: entry.name, cited });
        }
      }
    }

    if (drifts.length > 0) {
      throw new Error(
        `${drifts.length} CI workflow(s) pin a Node major != .nvmrc (${expectedMajor}):\n` +
          drifts
            .map(
              (d) => `  - .github/workflows/${d.file}: node-version=${d.cited}`,
            )
            .join("\n") +
          `\n\nFix one of:\n` +
          `  - Bump the workflow to match .nvmrc major (${expectedMajor})\n` +
          `  - Update .nvmrc if the project is intentionally tracking a different major\n` +
          `  - Switch the workflow to "lts/*" if floating-LTS tracking is intentional\n`,
      );
    }
    expect(drifts.length).toBe(0);
  });
});
