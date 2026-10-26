import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(TESTS_DIR);
const NETWORKIDLE_TOKEN = /\bnetworkidle\b/;

type SourceFile = { path: string; source: string };

function isSpecPath(path: string): boolean {
  return path.startsWith("tests/") && path.endsWith(".spec.ts");
}

function isHelperSourcePath(path: string): boolean {
  return path.startsWith("tests/helpers/") && path.endsWith(".ts");
}

function isGuardedPath(path: string): boolean {
  return isSpecPath(path) || isHelperSourcePath(path);
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return entry.isFile() ? [fullPath] : [];
  });
}

function readGuardedSources(): SourceFile[] {
  return listFiles(TESTS_DIR)
    .map((fullPath) => ({
      fullPath,
      path: relative(REPO_ROOT, fullPath).split(sep).join("/"),
    }))
    .filter(({ path }) => isGuardedPath(path))
    .map(({ fullPath, path }) => ({
      path,
      source: readFileSync(fullPath, "utf8"),
    }));
}

function findNetworkidleReferences(files: readonly SourceFile[]): string[] {
  return files
    .filter(
      ({ path, source }) =>
        isGuardedPath(path) && NETWORKIDLE_TOKEN.test(source),
    )
    .map(({ path }) => path);
}

describe("Playwright sources avoid networkidle waits", () => {
  test.each([
    {
      path: "tests/negative-control.spec.ts",
      source: 'await page.waitForLoadState("networkidle");',
    },
    {
      path: "tests/negative-control.spec.ts",
      source: 'const state = "networkidle"; await page.waitForLoadState(state);',
    },
    {
      path: "tests/helpers/negative-control.ts",
      source: 'await page.goto("/", { waitUntil: "networkidle" });',
    },
  ])("detects a forbidden token in $path", (sourceFile) => {
    expect(findNetworkidleReferences([sourceFile])).toEqual([sourceFile.path]);
  });

  test("walks known specs and helpers before checking the real tree", () => {
    const files = readGuardedSources();
    const specs = files.filter(({ path }) => isSpecPath(path));

    expect(specs.map(({ path }) => path)).toContain("tests/home.spec.ts");
    expect(specs.length).toBeGreaterThanOrEqual(15);
    expect(files.map(({ path }) => path)).toContain(
      "tests/helpers/trust-chain-hydration.ts",
    );
    expect(findNetworkidleReferences(files)).toEqual([]);
  });
});
