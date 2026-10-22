import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LYCHEE_INPUT_GLOBS = ["*.md", "public/**/*.html", "src/**/*.astro"] as const;

const BARE_JSDELIVR_NPM_PREFIX_RE =
  /https?:\/\/cdn\.jsdelivr\.net\/npm\/(?:@[^/\s`"'<>?#]+\/)?[^/\s`"'<>?#]+\/(?=$|[\s`"'<>),.;!?])/g;

function listTrackedLycheeInputFiles(): readonly string[] {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_COMMON_DIR;
  delete env.GIT_INDEX_FILE;

  return execFileSync("git", ["ls-files", "-z", "--", ...LYCHEE_INPUT_GLOBS], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env,
  })
    .split("\0")
    .filter((path) => path.length > 0);
}

function findBareJsDelivrPrefixes(source: string): readonly string[] {
  return Array.from(source.matchAll(BARE_JSDELIVR_NPM_PREFIX_RE), ([url]) => url);
}

function readGeneratedLycheeExcludes(): readonly string[] {
  const config = readFileSync(join(REPO_ROOT, "lychee.toml"), "utf8");
  const section = config.match(/^exclude = \[\r?\n([\s\S]*?)^\]/m)?.[1];
  if (section === undefined) throw new Error("lychee.toml has no exclude array");

  return section
    .split(/\r?\n/)
    .flatMap((line) => {
      const literal = line.match(/^\s*"((?:\\.|[^"\\])*)",?\s*$/)?.[1];
      return literal === undefined ? [] : [JSON.parse(`"${literal}"`) as string];
    });
}

function trackedBareJsDelivrPrefixes(): readonly string[] {
  const urls = new Set<string>();
  for (const path of listTrackedLycheeInputFiles()) {
    const source = readFileSync(join(REPO_ROOT, path), "utf8");
    for (const url of findBareJsDelivrPrefixes(source)) urls.add(url);
  }
  return [...urls].sort();
}

function findUnexcludedUrls(
  urls: readonly string[],
  exclusions: readonly string[],
): readonly string[] {
  const regexes = exclusions.map((pattern) => new RegExp(pattern));
  return urls.filter((url) => !regexes.some((pattern) => pattern.test(url)));
}

describe("Lychee exclusions for bare jsDelivr npm path-prefixes", () => {
  it("scans the tracked inputs configured for Lychee", () => {
    const paths = listTrackedLycheeInputFiles();
    const workflow = readFileSync(
      join(REPO_ROOT, ".github", "workflows", "link-check.yml"),
      "utf8",
    );

    expect(paths.some((path) => path.endsWith(".md"))).toBe(true);
    expect(paths.some((path) => path.startsWith("src/") && path.endsWith(".astro"))).toBe(true);
    expect(LYCHEE_INPUT_GLOBS).toEqual(["*.md", "public/**/*.html", "src/**/*.astro"]);
    expect(workflow).toContain("'./**/*.md'");
    expect(workflow).toContain("'./public/**/*.html'");
    expect(workflow).toContain("'./src/**/*.astro'");
  });

  it("excludes every bare prefix found in tracked Markdown, HTML, and Astro", () => {
    const urls = trackedBareJsDelivrPrefixes();
    const exclusions = readGeneratedLycheeExcludes();

    expect(urls).toContain("https://cdn.jsdelivr.net/npm/@docsearch/");
    expect(findUnexcludedUrls(urls, exclusions)).toEqual([]);
  });

  it("reports a tracked prefix when its matching exclusion is removed (negative control)", () => {
    const urls = trackedBareJsDelivrPrefixes();
    const exclusions = readGeneratedLycheeExcludes();
    const controlUrl = urls[0];

    expect(controlUrl).toBeDefined();
    const matchingExclusions = exclusions.filter((pattern) =>
      new RegExp(pattern).test(controlUrl!),
    );
    expect(matchingExclusions.length).toBeGreaterThan(0);

    const withoutMatchingExclusions = exclusions.filter(
      (pattern) => !matchingExclusions.includes(pattern),
    );
    expect(findUnexcludedUrls([controlUrl!], withoutMatchingExclusions)).toEqual([
      controlUrl,
    ]);
  });
});
