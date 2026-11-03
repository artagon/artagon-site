// LAYOUT-13: session artifacts under OpenSpec change scratch stay untracked and
// are excluded from filesystem-walking lint inputs.
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";
import { walkFiles } from "./helpers/lint-discovery.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CHANGES = join(ROOT, "openspec", "changes");
const ARCHIVE = join(CHANGES, "archive");
const LINT_CHANGE = join(CHANGES, "standardize-repository-layout");
const scratchRoot = join(LINT_CHANGE, "scratch");
const scratchRootExisted = existsSync(scratchRoot);
const scratchProbe = join(scratchRoot, `layout-13-probe-${process.pid}.md`);

function changeDirectories(): string[] {
  const active = readdirSync(CHANGES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "archive")
    .map((entry) => join(CHANGES, entry.name));
  const archived = readdirSync(ARCHIVE, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ARCHIVE, entry.name));
  return [...active, ...archived];
}

function runScratchSensitiveLints(): string {
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
  return `${result.stdout}\n${result.stderr}`;
}

describe("OpenSpec change scratch is local-only (LAYOUT-13)", () => {
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
      {
        cwd: ROOT,
        encoding: "utf8",
      },
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

  test("filesystem-walking lints ignore a broken scratch probe", () => {
    mkdirSync(scratchRoot, { recursive: true });
    try {
      writeFileSync(
        scratchProbe,
        [
          "# Unreviewed local probe",
          "Broken citation: `openspec/changes/not-a-real-change/tasks.md`.",
          "Raw color: `#ff00aa`.",
          "Stale package claim: `@astrojs/rss@0.0.1`.",
          "Orphan-script probe: `npm run layout-13-scratch-only`.",
          "",
        ].join("\n"),
      );

      const markdownFiles = walkFiles(LINT_CHANGE, (file) =>
        file.endsWith(".md"),
      );
      expect(markdownFiles).toContain(join(LINT_CHANGE, "tasks.md"));
      expect(markdownFiles).not.toContain(scratchProbe);
      expect(readFileSync(scratchProbe, "utf8")).toContain("#ff00aa");

      runScratchSensitiveLints();
    } finally {
      if (existsSync(scratchProbe)) unlinkSync(scratchProbe);
      if (!scratchRootExisted && existsSync(scratchRoot))
        rmdirSync(scratchRoot);
    }
  }, 120_000);
});
