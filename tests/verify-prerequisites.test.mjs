// Tests for scripts/verify-prerequisites.mjs (USMR Phase 0.5).
// Validates the four exit-code states by building synthetic openspec
// trees in OS tmp dirs and pointing the script at them via argv[2].
//
// Run: node --test tests/verify-prerequisites.test.mjs
//      (or: npm run test:prerequisites)

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCRIPT = join(ROOT, "scripts", "verify-prerequisites.mjs");

function buildFixture({ inFlight, archived }) {
  const root = mkdtempSync(join(tmpdir(), "verify-prereq-"));
  mkdirSync(join(root, "openspec", "changes"), { recursive: true });
  if (inFlight) {
    mkdirSync(
      join(root, "openspec", "changes", "refactor-styling-architecture"),
      { recursive: true },
    );
    writeFileSync(
      join(
        root,
        "openspec",
        "changes",
        "refactor-styling-architecture",
        "tasks.md",
      ),
      "# placeholder\n",
    );
  }
  if (archived) {
    mkdirSync(
      join(
        root,
        "openspec",
        "changes",
        "archive",
        "2026-05-04-refactor-styling-architecture",
      ),
      { recursive: true },
    );
    writeFileSync(
      join(
        root,
        "openspec",
        "changes",
        "archive",
        "2026-05-04-refactor-styling-architecture",
        "tasks.md",
      ),
      "# archived placeholder\n",
    );
  }
  return root;
}

function runScript(rootArg) {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, rootArg], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout: out, stderr: "" };
  } catch (err) {
    return {
      code: typeof err.status === "number" ? err.status : 1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

test("state (a): refactor-styling-architecture archived → exit 0", () => {
  const root = buildFixture({ inFlight: false, archived: true });
  try {
    const result = runScript(root);
    assert.equal(
      result.code,
      0,
      `expected exit 0; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stdout, /archived.*USMR prerequisites satisfied/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("state (d): refactor-styling-architecture in flight + not archived → exit 1", () => {
  const root = buildFixture({ inFlight: true, archived: false });
  try {
    const result = runScript(root);
    assert.equal(
      result.code,
      1,
      `expected exit 1; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stderr, /in flight.*not yet archived/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("state (c): neither in flight nor archived + no commit evidence → exit 2", () => {
  // Build a tree where openspec exists but neither the in-flight dir nor
  // an archive entry. Note: the script also checks `git log` for commit
  // evidence, which will succeed against the actual repo since
  // refactor-styling-architecture WAS archived in PR #39. Our test fixture
  // path is /tmp/..., which `git log` runs against — and the script's
  // `cwd` for git is `ROOT` (the fixture root), where `git` is not a
  // repo, so `hasStylingArchiveAncestor()` returns false (try/catch).
  const root = buildFixture({ inFlight: false, archived: false });
  try {
    const result = runScript(root);
    assert.equal(
      result.code,
      2,
      `expected exit 2; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(
      result.stderr,
      /neither archived nor in flight.*no archive commit/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("state (b): both archived AND in flight → exit 0 (archive wins)", () => {
  // Edge case: openspec sometimes leaves the in-flight directory behind
  // briefly during archive. Verify the archive check takes precedence so
  // the gate doesn't false-positive during that window.
  const root = buildFixture({ inFlight: true, archived: true });
  try {
    const result = runScript(root);
    assert.equal(
      result.code,
      0,
      `expected exit 0; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stdout, /archived.*USMR prerequisites satisfied/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("usage error: openspec tree missing → exit 2", () => {
  const root = mkdtempSync(join(tmpdir(), "verify-prereq-noopenspec-"));
  try {
    const result = runScript(root);
    assert.equal(
      result.code,
      2,
      `expected exit 2; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stderr, /openspec\/ tree not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
