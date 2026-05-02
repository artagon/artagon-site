// Drift-gate + sync-determinism tests. node:test, NOT Playwright.
// Run: node --test tests/build-config.test.mjs (or npm run test:build-config)

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GENERATED = [join(ROOT, "lighthouserc.json"), join(ROOT, "lychee.toml")];

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function runSync(extraArgs = []) {
  return execFileSync(
    process.execPath,
    ["scripts/sync-build-config.mjs", ...extraArgs],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, GITHUB_ACTIONS: "" },
    },
  );
}

test("CI mode auto-promotes to --check (no writes under GITHUB_ACTIONS=true)", () => {
  // When GITHUB_ACTIONS=true, sync must run in --check mode (no writes).
  // This guards against a regression where the auto-promote logic gets
  // disabled and CI starts mutating committed files.
  const out = execFileSync(
    process.execPath,
    ["scripts/sync-build-config.mjs"],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, GITHUB_ACTIONS: "true" },
    },
  );
  // In CI mode with up-to-date generated files, sync exits 0 silently
  // (no "wrote" or "would write" messages); drift would exit non-zero.
  assert.doesNotMatch(out, /✓ wrote /, "CI mode must not write files");
});

test("sync produces no diff against committed generated files", () => {
  runSync();
  try {
    execFileSync(
      "git",
      ["diff", "--exit-code", "--", "lighthouserc.json", "lychee.toml"],
      { cwd: ROOT, stdio: "pipe" },
    );
  } catch (err) {
    assert.fail(
      `build config drift — run \`npm run sync:build-config\` locally and commit:\n${err.stdout?.toString() ?? err.message}`,
    );
  }
});

test("sync is idempotent (10x byte-identical output)", () => {
  runSync();
  const baseline = GENERATED.map(sha256);
  for (let i = 0; i < 9; i++) {
    runSync();
    const current = GENERATED.map(sha256);
    for (let j = 0; j < baseline.length; j++) {
      assert.equal(
        current[j],
        baseline[j],
        `iteration ${i + 1}: ${GENERATED[j]} hash drifted`,
      );
    }
  }
});

test("path validator rejects traversal", () => {
  const cfgPath = join(ROOT, "build.config.json");
  const backupPath = join(ROOT, "build.config.json.bak");
  const original = readFileSync(cfgPath, "utf8");

  // Write backup BEFORE mutating; if the test process is killed mid-run,
  // the contributor can recover via `cp build.config.json.bak build.config.json`.
  writeFileSync(backupPath, original);

  // SIGTERM/SIGINT handler ensures the original file is restored even if
  // the runner cancels the test. Idempotent — safe to call multiple times.
  const restore = () => {
    try {
      writeFileSync(cfgPath, original);
    } catch {}
    try {
      execFileSync("rm", ["-f", backupPath], { stdio: "ignore" });
    } catch {}
  };
  process.once("SIGTERM", restore);
  process.once("SIGINT", restore);

  const malicious = JSON.parse(original);
  malicious.dist = "../../../etc/cron.d/x";
  writeFileSync(cfgPath, JSON.stringify(malicious, null, 2) + "\n");
  let exited = false;
  let stderr = "";
  try {
    runSync();
  } catch (err) {
    exited = true;
    stderr = err.stderr?.toString() ?? err.message;
  } finally {
    restore();
  }
  assert.ok(exited, "sync MUST exit non-zero on path-traversal input");
  assert.match(
    stderr,
    /invalid path string|rejected suspicious/,
    "expected path-traversal rejection in stderr",
  );
});
