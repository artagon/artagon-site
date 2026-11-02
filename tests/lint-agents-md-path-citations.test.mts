// docs/agents/README.md cites this gate, which scans AGENTS.md and docs/agents/*.md.

import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  findPathCitationDrifts,
  inspectPathCitationSource,
  pathCitationSources,
} from "./helpers/lint-discovery.js";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCES = pathCitationSources(ROOT);
const MOVED_AUDIT_PATH = "docs/archive/2025-11-12-site-audit.md";
const AUDIT_CITATION_SOURCES = [
  "README.md",
  ".agents/context/glossary.md",
  "docs/archive/2025-11-12-site-audit.md",
  "openspec/changes/update-site-marketing-redesign/evidence/implementation-history.md",
  "openspec/changes/standardize-repository-layout/evidence/layout-baseline.md",
] as const;

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

  test("directly resolves moved audit citations and rejects the old path", () => {
    // USMR site-w1n.6: resolve each complete moved-audit citation through the same
    // parser used by the negative control; Lychee may not extract every occurrence.
    const citations = AUDIT_CITATION_SOURCES.flatMap((sourcePath) => {
      const source = readFileSync(resolve(ROOT, sourcePath), "utf8");
      return [
        ...source.matchAll(
          /`([^`]*docs\/archive\/2025-11-12-site-audit\.md[^`]*)`/g,
        ),
      ].map((match) => ({ sourcePath, token: match[0] }));
    });
    const sourcesWithCitations = [
      ...new Set(citations.map(({ sourcePath }) => sourcePath)),
    ].sort();

    expect(sourcesWithCitations).toEqual([...AUDIT_CITATION_SOURCES].sort());
    expect(
      citations.filter(
        ({ sourcePath }) =>
          sourcePath ===
          "openspec/changes/update-site-marketing-redesign/evidence/implementation-history.md",
      ),
    ).toHaveLength(7);
    for (const citation of citations) {
      expect(
        findPathCitationDrifts(ROOT, citation.sourcePath, citation.token, {
          pathPrefixes: ["docs/"],
        }),
        citation.token,
      ).toEqual([]);
    }

    const validCitation = citations[0]!;
    const missingCitation = validCitation.token.replace(
      MOVED_AUDIT_PATH,
      `${MOVED_AUDIT_PATH}-missing`,
    );
    expect(
      findPathCitationDrifts(
        ROOT,
        "moved-audit-negative-control.md",
        missingCitation,
        {
          pathPrefixes: ["docs/"],
        },
      ),
    ).toEqual([`moved-audit-negative-control.md: ${MOVED_AUDIT_PATH}-missing`]);

    const oldPath = "docs/SITE_AUDIT.md";
    expect(existsSync(resolve(ROOT, oldPath))).toBe(false);
    expect(
      findPathCitationDrifts(
        ROOT,
        "old-audit-path-control.md",
        `Old citation control: \`${oldPath}\`.`,
        { pathPrefixes: ["docs/"] },
      ),
    ).toEqual([`old-audit-path-control.md: ${oldPath}`]);
  });
});
