// Unit tests for scripts/verify-design-prerequisites.mjs
// Per `adopt-design-md-format` Phase 0.6 acceptance:
//   (a) redesign in flight + tasks reference old paths → exit 1
//   (b) redesign in flight + tasks updated → exit 0
//   (c) redesign archived → exit 0 regardless of historical references

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(
  __dirname,
  "..",
  "scripts",
  "verify-design-prerequisites.mjs",
);
const FIXTURES = join(__dirname, "fixtures", "design-md-prereqs");

function runVerify(rootFixture) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [SCRIPT, join(FIXTURES, rootFixture)],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      code: err.status ?? -1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

test("state (a): redesign in flight + stale path references → exit 1", () => {
  const result = runVerify("state-a");
  assert.equal(result.code, 1, "expected non-zero exit");
  assert.match(result.stderr, /references stale path/);
  assert.match(result.stderr, /new-design\/extracted\/DESIGN\.md/);
});

test("state (b): redesign in flight + tasks updated → exit 0", () => {
  const result = runVerify("state-b");
  assert.equal(result.code, 0, "expected zero exit");
  assert.match(result.stdout, /no longer references/);
});

test("state (c): redesign archived → exit 0 regardless of historical refs", () => {
  // state-c has the redesign directory ONLY under archive/, not under changes/.
  // Historical refs in archived tasks.md MUST NOT trigger failure.
  const result = runVerify("state-c");
  assert.equal(result.code, 0, "expected zero exit");
  assert.match(result.stdout, /archived/);
});
