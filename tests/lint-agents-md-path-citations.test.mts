// docs/agents/README.md cites this gate, which scans AGENTS.md and docs/agents/*.md.

import { describe, expect, test } from "vitest";
import {
  findPathCitationDrifts,
  inspectPathCitationSource,
  pathCitationSources,
} from "./helpers/lint-discovery.js";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCES = pathCitationSources(ROOT);

describe("repository documentation path citations vs disk", () => {
  for (const source of SOURCES) {
    // CODEOWNERS cites the build-artifacts gate as migration evidence;
    // that source row stays under its original test filename.
    if (source.name === "docs/build-artifacts.md") continue;

    test(`${source.name} citations resolve`, () => {
      expect(inspectPathCitationSource(ROOT, source)).toEqual([]);
    });
  }

  test("negative control reports a missing cited path", () => {
    const drifts = findPathCitationDrifts(
      ROOT,
      "negative-control.md",
      "A broken citation: `tests/__lint_path_citation_missing__.mts`.",
      { pathPrefixes: ["tests/"] },
    );
    expect(drifts).toEqual([
      "negative-control.md: tests/__lint_path_citation_missing__.mts",
    ]);
  });
});
