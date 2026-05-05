// Tests for scripts/verify-prerequisites.mjs (USMR Phase 0.5).
// Validates the four exit-code states by building synthetic openspec
// trees in OS tmp dirs and pointing the script at them via argv[2].
//
// Run: node --test tests/verify-prerequisites.test.mjs
//      (or: npm run test:prerequisites)
//
// State machine:
//   - state (a): archived (entry under openspec/changes/archive/) → exit 0
//   - state (b): not archived + ancestor SHA in HEAD → exit 0
//   - state (c): not archived + ancestor SHA NOT in HEAD → exit 2
//   - state (d): in flight (openspec/changes/<change>/) → exit 1
//
// Note on phrasing-coupled assertions: each test matches on a STABLE
// substring per state (e.g. "USMR prerequisites satisfied", "in flight",
// "is not an ancestor of HEAD"). If the script copy changes, update the
// regexes here in lockstep — these are the load-bearing assertion targets.

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

// Run a sequence of git commands against a fixture tmpdir. Used by
// state-(b) tests to plant a synthetic ancestor commit.
function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  });
}

function runScript(rootArg, opts = {}) {
  // opts.noArgv2 — invoke without argv[2] to test the default-ROOT path.
  // opts.env — extra env vars (used to disable git PATH for test (c)).
  const args = opts.noArgv2 ? [SCRIPT] : [SCRIPT, rootArg];
  try {
    const out = execFileSync(process.execPath, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(opts.env ?? {}) },
      cwd: opts.cwd ?? process.cwd(),
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

// ─────────────────────────────────────────────────────────────────────────
// state (a) — archive directory present
// ─────────────────────────────────────────────────────────────────────────

test("state (a): refactor-styling-architecture archived → exit 0", () => {
  const root = buildFixture({ inFlight: false, archived: true });
  try {
    const result = runScript(root);
    assert.equal(
      result.code,
      0,
      `expected exit 0; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stdout, /USMR prerequisites satisfied/);
    assert.match(result.stdout, /entry found in openspec\/changes\/archive/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("state (a) precedence: archive dir wins even when in-flight dir lingers", () => {
  // openspec sometimes leaves the in-flight directory behind briefly
  // during archive. Verify the archive-dir check takes precedence so the
  // gate doesn't false-positive during that window. Was previously named
  // "state (b)" — but state (b) is the ancestor branch, not this case.
  const root = buildFixture({ inFlight: true, archived: true });
  try {
    const result = runScript(root);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /USMR prerequisites satisfied/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// state (b) — archive dir absent, ancestor SHA in HEAD's history
// ─────────────────────────────────────────────────────────────────────────

test("state (b): archive dir absent + pinned SHA is HEAD ancestor → exit 0", () => {
  // Build a real git repo in the tmpdir whose HEAD IS the "pinned" SHA.
  // We create a fresh commit in the fixture, capture its SHA, then override
  // VERIFY_PREREQ_ARCHIVE_SHA via env so the script treats that commit as
  // the archive ancestor. This avoids fetching the upstream hardcoded SHA
  // which is unreachable in shallow clones (e.g. agent sandboxes, CI with
  // fetch-depth != 0 but grafted history).
  const root = buildFixture({ inFlight: false, archived: false });
  try {
    git(root, "init", "-q", "-b", "main");
    // Plant a commit so HEAD is non-empty.
    writeFileSync(join(root, "README"), "squash: refactor-styling-architecture\n");
    git(root, "add", "README");
    git(root, "commit", "-q", "-m", "squash: refactor-styling-architecture");
    // The commit we just made IS HEAD, so `merge-base --is-ancestor sha HEAD`
    // trivially succeeds.
    const sha = git(root, "rev-parse", "HEAD").trim();

    const result = runScript(root, { env: { VERIFY_PREREQ_ARCHIVE_SHA: sha } });
    assert.equal(
      result.code,
      0,
      `expected exit 0; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stdout, /ancestor of HEAD/);
    assert.match(result.stdout, /USMR prerequisites satisfied/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("state (b) negative: archive dir absent + pinned SHA NOT in history → exit 2", () => {
  // git repo exists but the pinned SHA is not fetched. `merge-base
  // --is-ancestor` fails with "Not a valid object name" → fallback path
  // returns "not-ancestor" → exit 2.
  const root = buildFixture({ inFlight: false, archived: false });
  try {
    git(root, "init", "-q", "-b", "main");
    // Plant a different commit so HEAD exists but the pinned SHA is
    // unreachable.
    writeFileSync(join(root, "README"), "test\n");
    git(root, "add", "README");
    git(root, "commit", "-q", "-m", "test commit");

    const result = runScript(root);
    assert.equal(
      result.code,
      2,
      `expected exit 2; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stderr, /not present in this clone|not an ancestor/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// state (c) — archive dir absent, no git repo (or no ancestor info)
// ─────────────────────────────────────────────────────────────────────────

test("state (c): archive dir absent + cwd not a git repo → exit 2", () => {
  const root = buildFixture({ inFlight: false, archived: false });
  try {
    const result = runScript(root);
    assert.equal(
      result.code,
      2,
      `expected exit 2; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stderr, /neither archived nor in flight/);
    assert.match(result.stderr, /not an ancestor of HEAD/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// state (d) — in-flight directory present, not yet archived
// ─────────────────────────────────────────────────────────────────────────

test("state (d): in flight + not archived → exit 1", () => {
  const root = buildFixture({ inFlight: true, archived: false });
  try {
    const result = runScript(root);
    assert.equal(
      result.code,
      1,
      `expected exit 1; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stderr, /in flight/);
    assert.match(result.stderr, /not yet archived/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// usage / environment errors
// ─────────────────────────────────────────────────────────────────────────

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

test("usage error: ROOT path is not a directory → exit 2", () => {
  // argv[2] points at a regular file. Tests the path.resolve + statSync
  // hardening (LO-1).
  const root = mkdtempSync(join(tmpdir(), "verify-prereq-notdir-"));
  const file = join(root, "not-a-dir");
  writeFileSync(file, "");
  try {
    const result = runScript(file);
    assert.equal(
      result.code,
      2,
      `expected exit 2; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
    assert.match(result.stderr, /not a directory/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("default ROOT (no argv[2]): runs against repo and finds archive → exit 0", () => {
  // Smoke test for the argv[2] default path. The actual repo has
  // refactor-styling-architecture archived (PR #39 squash) so this
  // exercises state (a) without an explicit ROOT.
  const result = runScript(undefined, { noArgv2: true });
  assert.equal(
    result.code,
    0,
    `expected exit 0; got ${result.code}.\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  assert.match(result.stdout, /USMR prerequisites satisfied/);
});
