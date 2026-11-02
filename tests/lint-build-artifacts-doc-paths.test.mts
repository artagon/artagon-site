// USMR Phase 5.5.16-pt200 — `docs/build-artifacts.md` path-citation gate.
//
// `docs/build-artifacts.md` is the contributor-facing build-system
// reference. When the prose cites a literal repo-rooted path inside
// backticks, the path MUST exist on disk. Otherwise contributors
// follow references to scripts that don't ship and proposal
// directories that have been archived.
//
// Pre-pt200 the file had 3 drifts:
//   1. line 3 cited `openspec/changes/standardize-build-artifacts` —
//      the proposal archived to
//      `openspec/changes/archive/2026-05-05-standardize-build-artifacts/`
//      but the doc didn't get the post-archive path update.
//   2. line 126 listed `scripts/sanitize-trace.mjs` in the
//      CODEOWNERS dual-review surface — but the script was specced
//      in the archived proposal AND NEVER actually authored. Same
//      drift class as pt183 (`verify:design-md-telemetry` claimed
//      CI-wired but wasn't).
//   3. line 158 cited `openspec/changes/standardize-build-artifacts/
//      design.md` (same issue as #1).
//
// Same documentation-vs-implementation drift class as pt178-181
// (path-citation gates), pt190 (openspec/contributing.md tutorial
// path), pt191 (Copilot trio docs), pt183 (claim-vs-disk for
// scripts).
//
// pt200 corrected the 3 drifts and locks the contract here. The
// shared policy table now lives in lint-discovery.ts with its sibling
// documentation gates.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  inspectPathCitationSource,
  pathCitationSources,
} from "./helpers/lint-discovery.js";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCE = pathCitationSources(ROOT).find(
  (source) => source.name === "docs/build-artifacts.md",
);

if (!SOURCE) {
  throw new Error("docs/build-artifacts.md policy is missing");
}

describe("docs/build-artifacts.md path citations vs disk (pt200)", () => {
  test("every literal repo-rooted path resolves on disk", () => {
    expect(inspectPathCitationSource(ROOT, SOURCE)).toEqual([]);
  });
});

// BUILD 1.3: the framework-managed root is distinct from the configured cache.
function assertAstroException(body: string) {
  expect(body).toMatch(/CLI-managed `\.astro\/` root directory is an exception/);
  expect(body).toMatch(/`astro dev` stores `data-store\.json` there/i);
  expect(body).toMatch(/Production builds store `data-store\.json` in `BUILD\.cache\.astro`\s*\(`\.build\/cache\/astro`\) instead/i);
  expect(body).toContain("node_modules/astro/dist/core/config/settings.js");
  expect(body).toContain("node_modules/astro/dist/content/paths.js");
}

test("documents the Astro root exception and production cache separately", () => {
  const body = readFileSync(join(ROOT, "docs/build-artifacts.md"), "utf8");
  assertAstroException(body);
  expect(() => assertAstroException(body.replaceAll(".astro/", ".other/"))).toThrow();
  expect(() => assertAstroException(body.replace("Production builds store", "All builds store"))).toThrow();
});
