// Tests for scripts/lint-taglines.mjs (USMR Phase 3 §"Tagline single source").
// Builds synthetic src/ trees in OS tmp dirs and points the script at
// them via argv[2].
//
// Run: node --test tests/lint-taglines.test.mjs
//
// Exit-code contract:
//   0 — no verbatim tagline literals found outside taglines.json
//   1 — at least one violation found
//   2 — usage / IO error (taglines.json missing or malformed)

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCRIPT = join(ROOT, "scripts", "lint-taglines.mjs");

const VALID_TAGLINES = JSON.stringify({
  tagline: {
    positioning:
      "Trusted identity for machines and humans — verified, private, attested.",
    full: "Trusted Identity for Machines and Humans — Verified, Private, Attested",
    short: "Verified, Private, Attested.",
    abbr: "V • P • A",
    inline: "Verified • Private • Attested",
    triad: [
      "Every claim, proven.",
      "Every token, bound.",
      "Every decision, traceable.",
    ],
  },
});

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "lint-taglines-"));
  const srcContent = join(root, "src", "content");
  mkdirSync(srcContent, { recursive: true });
  writeFileSync(join(srcContent, "taglines.json"), VALID_TAGLINES);
  return { root, srcContent };
}

function writeSourceFile(root, relPath, body) {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf8");
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

test("exits 0 when no source files contain hardcoded tagline strings", () => {
  const { root } = makeFixture();
  try {
    writeSourceFile(
      root,
      "src/components/Tagline.astro",
      `---\nimport taglines from '../content/taglines.json';\n---\n<span>{taglines.tagline.short}</span>`,
    );
    const result = run(root);
    assert.equal(result.code, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /all tagline strings sourced from taglines\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 1 when an .astro file hardcodes tagline.short", () => {
  const { root } = makeFixture();
  try {
    writeSourceFile(
      root,
      "src/components/BadTagline.astro",
      `---\n---\n<span>Verified, Private, Attested.</span>`,
    );
    const result = run(root);
    assert.equal(result.code, 1, `stdout: ${result.stdout}`);
    assert.match(result.stderr, /BadTagline\.astro/);
    assert.match(result.stderr, /Verified, Private, Attested\./);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 0 when an .mdx content file contains a tagline string (prose content excluded)", () => {
  const { root } = makeFixture();
  try {
    writeSourceFile(
      root,
      "src/content/pages/home.mdx",
      `---\ntitle: Home\n---\n\nEvery claim, proven. Every token, bound.`,
    );
    const result = run(root);
    // .mdx files are not scanned — prose content is legitimate
    assert.equal(result.code, 0, `stderr: ${result.stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 1 when a .ts file hardcodes a triad clause", () => {
  const { root } = makeFixture();
  try {
    writeSourceFile(
      root,
      "src/lib/meta.ts",
      `export const desc = "Every token, bound.";`,
    );
    const result = run(root);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /meta\.ts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 0 when taglines.json itself contains the guarded strings (excluded from scan)", () => {
  const { root } = makeFixture();
  try {
    // Only taglines.json has the strings — no source files
    const result = run(root);
    assert.equal(result.code, 0, `stderr: ${result.stderr}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 2 when taglines.json is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "lint-taglines-noconfig-"));
  const srcDir = join(root, "src");
  mkdirSync(srcDir, { recursive: true });
  try {
    const result = run(root);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /taglines\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exits 2 when taglines.json is malformed (missing tagline.short)", () => {
  const root = mkdtempSync(join(tmpdir(), "lint-taglines-malformed-"));
  const srcContent = join(root, "src", "content");
  mkdirSync(srcContent, { recursive: true });
  writeFileSync(
    join(srcContent, "taglines.json"),
    JSON.stringify({ tagline: { triad: [] } }),
  );
  const srcDir = join(root, "src");
  mkdirSync(srcDir, { recursive: true });
  try {
    const result = run(root);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /tagline\.short/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
