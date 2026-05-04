// Snapshot tests for tests/fixtures/design-md/{good,bad}.md
// Per `adopt-design-md-format` Phase 2.9.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FIXTURES = join(__dirname, "fixtures", "design-md");
const CLI = join(ROOT, "node_modules", ".bin", "design.md");

function lint(fixturePath) {
  try {
    const stdout = execFileSync(CLI, ["lint", fixturePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      code: err.status ?? -1,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

test("good.md lints with zero errors", () => {
  const result = lint(join(FIXTURES, "good.md"));
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.summary.errors, 0, "expected 0 errors on good.md");
  assert.equal(result.code, 0, "expected exit code 0");
});

test("bad.md lints with at least 1 error and exits non-zero", () => {
  const result = lint(join(FIXTURES, "bad.md"));
  const parsed = JSON.parse(result.stdout);
  assert.ok(
    parsed.summary.errors >= 1,
    `expected ≥ 1 error on bad.md, got ${parsed.summary.errors}`,
  );
  assert.notEqual(result.code, 0, "expected non-zero exit code on bad.md");
  // Verify the seeded broken-ref error is present
  const hasBrokenRef = parsed.findings.some(
    (f) =>
      f.severity === "error" &&
      (f.message?.includes("does-not-exist") || f.path?.includes("textColor")),
  );
  assert.ok(hasBrokenRef, "expected broken-ref error on textColor reference");
});
