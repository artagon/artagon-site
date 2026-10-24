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
