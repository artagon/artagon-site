// LAYOUT-12B / R5L12: keep extracted history anchors and change-qualified links navigable.

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fromMarkdown } from "mdast-util-from-markdown";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const HISTORY_PATH = resolve(
  ROOT,
  "openspec/changes/update-site-marketing-redesign/evidence/implementation-history.md",
);
const PROJECT_PATH = resolve(ROOT, "openspec/project.md");
const TASKS_PATH = resolve(ROOT, "openspec/changes/update-site-marketing-redesign/tasks.md");
const BASELINE_PATH = resolve(
  ROOT,
  "openspec/changes/standardize-repository-layout/evidence/usmr-checkbox-baseline.json",
);
const HISTORY_ANCHOR = '<div id="archive-citation-sweep"></div>';
const HISTORY_LINK = "evidence/implementation-history.md#package-version-citations";

type MarkdownNode = {
  children?: unknown[];
  type?: string;
  url?: string;
  value?: string;
};

function collectNodes(value: unknown, nodes: MarkdownNode[] = []): MarkdownNode[] {
  if (value === null || typeof value !== "object") return nodes;
  const node = value as MarkdownNode;
  if (typeof node.type === "string") nodes.push(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) collectNodes(child, nodes);
  }
  return nodes;
}

function assertLinkTargets(markdown: string, targetUrl: string, targetPath: string): void {
  const link = collectNodes(fromMarkdown(markdown)).find(
    (node) => node.type === "link" && node.url === targetUrl,
  );
  if (!link) throw new Error(`Expected Markdown link to ${targetUrl}`);

  const resolved = resolve(dirname(HISTORY_PATH), targetUrl.split("#", 1)[0] ?? "");
  if (!existsSync(resolved) || resolved !== resolve(ROOT, targetPath)) {
    throw new Error(`${targetUrl} resolves to ${resolved}, not ${targetPath}`);
  }
}

describe("USMR extracted-history Markdown references", () => {
  const history = readFileSync(HISTORY_PATH, "utf8");

  it("renders the archive-sweep anchor as a standalone HTML block linked from the project guide", () => {
    const historyTree = fromMarkdown(history);
    expect(
      historyTree.children.some(
        (node) => node.type === "html" && String(node.value).includes('id="archive-citation-sweep"'),
      ),
    ).toBe(true);
    expect(history.split("\n").filter((line) => line === HISTORY_ANCHOR)).toHaveLength(1);

    const project = readFileSync(PROJECT_PATH, "utf8");
    const projectLink = collectNodes(fromMarkdown(project)).find(
      (node) =>
        node.type === "link" &&
        node.url ===
          "changes/update-site-marketing-redesign/evidence/implementation-history.md#archive-citation-sweep",
    );
    expect(projectLink).toBeDefined();
    expect(
      resolve(dirname(PROJECT_PATH), projectLink?.url?.split("#", 1)[0] ?? ""),
    ).toBe(HISTORY_PATH);
  });

  it("keeps rewritten citations inside the change named by each link", () => {
    const targets = [
      ["../../migrate-deploy-to-cloudflare-pages/design.md", "openspec/changes/migrate-deploy-to-cloudflare-pages/design.md"],
      ["../../migrate-deploy-to-cloudflare-pages/proposal.md", "openspec/changes/migrate-deploy-to-cloudflare-pages/proposal.md"],
      ["../../migrate-deploy-to-cloudflare-pages/tasks.md", "openspec/changes/migrate-deploy-to-cloudflare-pages/tasks.md"],
      ["../../self-host-woff2-fonts/proposal.md#L58", "openspec/changes/self-host-woff2-fonts/proposal.md"],
      ["../../self-host-woff2-fonts/design.md#L152", "openspec/changes/self-host-woff2-fonts/design.md"],
      ["../../self-host-woff2-fonts/tasks.md#L24", "openspec/changes/self-host-woff2-fonts/tasks.md"],
      ["../../self-host-woff2-fonts/tasks.md#L37", "openspec/changes/self-host-woff2-fonts/tasks.md"],
      ["../../self-host-woff2-fonts/tasks.md#L42", "openspec/changes/self-host-woff2-fonts/tasks.md"],
      ["../../self-host-woff2-fonts/tasks.md#L64", "openspec/changes/self-host-woff2-fonts/tasks.md"],
      ["../../add-brand-assets-and-writing-pipeline/proposal.md", "openspec/changes/add-brand-assets-and-writing-pipeline/proposal.md"],
      ["../../add-brand-assets-and-writing-pipeline/design.md", "openspec/changes/add-brand-assets-and-writing-pipeline/design.md"],
      ["../../add-brand-assets-and-writing-pipeline/tasks.md", "openspec/changes/add-brand-assets-and-writing-pipeline/tasks.md"],
      ["../../add-brand-assets-and-writing-pipeline/specs/site-writing-pipeline/spec.md", "openspec/changes/add-brand-assets-and-writing-pipeline/specs/site-writing-pipeline/spec.md"],
    ] as const;

    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as {
      migration: {
        fixRound: {
          reviewedLinks: Array<{ url: string; target: string; sameTarget: boolean }>;
        };
      };
    };

    for (const [url, target] of targets) assertLinkTargets(history, url, target);
    for (const [url, target] of targets) {
      expect(baseline.migration.fixRound.reviewedLinks).toContainEqual({
        url,
        target,
        sameTarget: true,
      });
    }
  });

  it("fails a negative control that redirects a Cloudflare citation into USMR", () => {
    const wrongTarget = history.replaceAll(
      "../../migrate-deploy-to-cloudflare-pages/design.md",
      "../design.md",
    );
    expect(() =>
      assertLinkTargets(
        wrongTarget,
        "../../migrate-deploy-to-cloudflare-pages/design.md",
        "openspec/changes/migrate-deploy-to-cloudflare-pages/design.md",
      ),
    ).toThrow();
  });

  it("keeps Cloudflare line citations qualified to the Cloudflare change", () => {
    for (const citation of [
      "../../migrate-deploy-to-cloudflare-pages/proposal.md (line 18)",
      "../../migrate-deploy-to-cloudflare-pages/proposal.md (line 28)",
      "../../migrate-deploy-to-cloudflare-pages/proposal.md (line 50)",
      "../../migrate-deploy-to-cloudflare-pages/design.md D3",
    ]) {
      expect(history).toContain(citation);
    }
    expect(history).not.toContain("cloudflare ../design.md");
    expect(history).not.toContain("cloudflare ../tasks.md");
  });

  it("keeps both task 4.6 package-version links outside the package code span", () => {
    const rows = readFileSync(TASKS_PATH, "utf8")
      .split("\n")
      .filter((line) => line.startsWith("- [x] 4.6 "));
    expect(rows).toHaveLength(2);

    for (const row of rows) {
      const nodes = collectNodes(fromMarkdown(row));
      expect(nodes.some((node) => node.type === "inlineCode" && node.value === "@astrojs/rss")).toBe(
        true,
      );
      expect(nodes.some((node) => node.type === "link" && node.url === HISTORY_LINK)).toBe(true);
    }
  });
});
