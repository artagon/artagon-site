// LAYOUT-13: session artifacts under OpenSpec change scratch stay untracked and
// only the matching change-scratch paths are excluded from lint discovery.
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";
import { findInvalidClamps } from "./helpers/clamp-syntax.js";
import { isChangeScratch } from "./helpers/change-scratch.js";
import { walkFiles } from "./helpers/lint-discovery.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CHANGES = join(ROOT, "openspec", "changes");
const ARCHIVE = join(CHANGES, "archive");

function activeChangeWithTasks(): string | undefined {
  return readdirSync(CHANGES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "archive")
    .map((entry) => join(CHANGES, entry.name))
    .find((changeDir) => existsSync(join(changeDir, "tasks.md")));
}

function changeDirectories(): string[] {
  const active = readdirSync(CHANGES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "archive")
    .map((entry) => join(CHANGES, entry.name));
  const archived = readdirSync(ARCHIVE, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ARCHIVE, entry.name));
  return [...active, ...archived];
}

function runScratchSensitiveLints(): void {
  const lintFiles = [
    "tests/lint-scoped-package-versions.test.mts",
    "tests/lint-source-comment-archive-paths.test.mts",
    "tests/lint-agents-md-symbolic-refs-sync.test.mts",
    "tests/lint-config-yaml-changes-sync.test.mts",
    "tests/lint-orphan-npm-scripts.test.mts",
    "tests/lint-agents-md-path-citations.test.mts",
  ];
  const result = spawnSync(
    process.execPath,
    [
      join(ROOT, "node_modules", "vitest", "vitest.mjs"),
      "run",
      "--maxWorkers=1",
      "--testTimeout=30000",
      ...lintFiles,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 90_000,
    },
  );
  expect(
    result.error,
    "filesystem-walking lint subprocess failed to start",
  ).toBeUndefined();
  expect(
    result.status,
    `filesystem-walking lints failed with scratch present:\n${result.stdout}\n${result.stderr}`,
  ).toBe(0);
}

describe("OpenSpec change scratch is local-only (LAYOUT-13)", () => {
  test("the shared predicate matches only active and archived change scratch", () => {
    expect(isChangeScratch("openspec/changes/demo/scratch/probe.md")).toBe(
      true,
    );
    expect(
      isChangeScratch(
        "openspec/changes/archive/2026-11-03-demo/scratch/probe.md",
      ),
    ).toBe(true);
    expect(isChangeScratch("src/components/scratch/Bad.css")).toBe(false);
    expect(isChangeScratch("openspec/changes/demo/scratchpad/probe.md")).toBe(
      false,
    );
  });

  test("Git ignores scratch in every active and archived change", () => {
    const changes = changeDirectories();
    expect(changes.length).toBeGreaterThan(0);

    const probes = [
      ...changes.map((changeDir) =>
        relative(ROOT, join(changeDir, "scratch", "probe.md")),
      ),
      "scratch/probe.md",
    ];
    const ignored = spawnSync("git", ["check-ignore", "--stdin"], {
      cwd: ROOT,
      encoding: "utf8",
      input: `${probes.join("\n")}\n`,
    });
    expect(ignored.error).toBeUndefined();
    expect(ignored.status, "git check-ignore --stdin failed").toBe(0);
    expect(new Set(ignored.stdout.trim().split("\n"))).toEqual(new Set(probes));

    const negative = spawnSync(
      "git",
      ["check-ignore", "--", "scratchpad/probe.md"],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(negative.error).toBeUndefined();
    expect(
      negative.status,
      "scratchpad must remain outside the scratch ignore rule",
    ).toBe(1);
  }, 15_000);

  test("no tracked file lives below any change scratch directory", () => {
    const tracked = execFileSync("git", ["ls-files"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
    const trackedScratch = tracked.filter(
      (path) =>
        path.startsWith("openspec/changes/") &&
        path.split("/").includes("scratch"),
    );

    expect(trackedScratch).toEqual([]);
  });

  test("change walkers exclude only change scratch and source scratch remains linted", () => {
    const changeDir = activeChangeWithTasks();
    expect(changeDir, "expected an active change with tasks.md").toBeDefined();
    if (!changeDir) throw new Error("no active change with tasks.md");

    const scratchRoot = join(changeDir, "scratch");
    const scratchRootExisted = existsSync(scratchRoot);
    const scratchProbe = join(scratchRoot, `layout-13-probe-${process.pid}.md`);
    const fixtureRoot = mkdtempSync(join(tmpdir(), "layout13-source-scratch-"));
    const fixtureSourceRoot = join(fixtureRoot, "src");
    const fixtureScratch = join(fixtureSourceRoot, "components", "scratch");
    const clampProbe = join(fixtureScratch, "Bad.css");

    try {
      if (!scratchRootExisted) mkdirSync(scratchRoot);
      mkdirSync(fixtureScratch, { recursive: true });
      const invalidCss = ".bad { width: clamp(10px, 2px + 1vw, 20px); }\n";
      writeFileSync(
        scratchProbe,
        "# Local lint probe\nStale package claim: `@astrojs/rss@0.0.1`.\n",
      );
      writeFileSync(clampProbe, invalidCss);

      expect(isChangeScratch(relative(ROOT, scratchProbe))).toBe(true);
      expect(isChangeScratch("src/components/scratch/Bad.css")).toBe(false);
      const changeMarkdown = walkFiles(changeDir, (file) =>
        file.endsWith(".md"),
      );
      expect(changeMarkdown).toContain(join(changeDir, "tasks.md"));
      expect(changeMarkdown).toContain(scratchProbe);
      runScratchSensitiveLints();

      const sourceFiles = walkFiles(fixtureSourceRoot, (file) =>
        file.endsWith(".css"),
      );
      expect(sourceFiles).toContain(clampProbe);
      expect(
        findInvalidClamps(
          readFileSync(clampProbe, "utf8"),
          "src/components/scratch/Bad.css",
        ),
      ).toHaveLength(1);
    } finally {
      if (existsSync(scratchProbe)) unlinkSync(scratchProbe);
      if (
        !scratchRootExisted &&
        existsSync(scratchRoot) &&
        readdirSync(scratchRoot).length === 0
      ) {
        rmdirSync(scratchRoot);
      }
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 120_000);
});
