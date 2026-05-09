// Tests for scripts/lint-skip-link.mjs (USMR Phase 3 §"Skip Link").
// Builds synthetic dist/ trees in OS tmp dirs and points the script at
// them via argv[2]. The script reads `build.config.json` from the
// passed root, so each fixture writes its own minimal config.
//
// Run: node --test tests/lint-skip-link.test.mjs
//
// Exit-code contract:
//   0 — every page has a valid skip-link as first focusable element
//   1 — at least one page is missing or has a malformed skip-link
//   2 — usage / IO error (build.config.json missing, dist not built)

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCRIPT = join(ROOT, "scripts", "lint-skip-link.mjs");

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "lint-skip-link-"));
  writeFileSync(
    join(root, "build.config.json"),
    JSON.stringify({ dist: ".build/dist" }),
  );
  const dist = join(root, ".build", "dist");
  mkdirSync(dist, { recursive: true });
  return { root, dist };
}

function writePage(dist, name, body) {
  writeFileSync(
    join(dist, name),
    `<!doctype html><html><head></head><body>${body}</body></html>`,
  );
}

function run(root) {
  try {
    const stdout = execFileSync("node", [SCRIPT, root], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      code: err.status ?? 2,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
    };
  }
}

test("exits 0 when every page has a valid skip-link as first focusable element", () => {
  const { root, dist } = makeFixture();
  try {
    writePage(
      dist,
      "index.html",
      `<a class="skip-link" href="#main-content">Skip</a><main id="main-content"><a href="/x">x</a></main>`,
    );
    writePage(
      dist,
      "about.html",
      `<a class="skip-link" href="#main-content">Skip</a><main id="main-content"></main>`,
    );
    const r = run(root);
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /2 page\(s\) verified/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 1 when first focusable is not a skip-link", () => {
  const { root, dist } = makeFixture();
  try {
    writePage(
      dist,
      "index.html",
      `<a href="/elsewhere">leak</a><a class="skip-link" href="#main-content">Skip</a><main id="main-content"></main>`,
    );
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /first focusable is not a skip-link/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 1 when skip-link target id missing on page", () => {
  const { root, dist } = makeFixture();
  try {
    writePage(
      dist,
      "index.html",
      `<a class="skip-link" href="#main-content">Skip</a><main id="other"></main>`,
    );
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /skip-link target #main-content not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("treats <button> as focusable (caught when before skip-link)", () => {
  const { root, dist } = makeFixture();
  try {
    writePage(
      dist,
      "index.html",
      `<button>x</button><a class="skip-link" href="#main-content">Skip</a><main id="main-content"></main>`,
    );
    const r = run(root);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /first focusable is not a skip-link/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ignores tabindex=-1 (programmatically focusable but not in tab order)", () => {
  const { root, dist } = makeFixture();
  try {
    // <main tabindex="-1"> precedes the skip-link physically but should NOT
    // count as focusable; the skip-link must still be reported as first.
    writePage(
      dist,
      "index.html",
      `<div tabindex="-1">programmatic</div><a class="skip-link" href="#main-content">Skip</a><main id="main-content"></main>`,
    );
    const r = run(root);
    assert.equal(r.code, 0, r.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 2 when build.config.json is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "lint-skip-link-noconfig-"));
  try {
    const r = run(root);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /cannot read build\.config\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 2 when dist directory does not exist", () => {
  const root = mkdtempSync(join(tmpdir(), "lint-skip-link-nodist-"));
  try {
    writeFileSync(
      join(root, "build.config.json"),
      JSON.stringify({ dist: ".build/dist" }),
    );
    const r = run(root);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /dist dir .* not found/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
