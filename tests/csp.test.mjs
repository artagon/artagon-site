// Tests for scripts/csp.mjs helpers (USMR Phase 3.6 §"Theme Toggle"
// orphan-hash detection + 'unsafe-inline' guard).
//
// Run: node --test tests/csp.test.mjs
//
// The script's main entry runs against a real dist/ tree; these tests
// exercise the pure helpers exported for unit testing:
//
//   - sha(buf): canonical base64 SHA-256
//   - buildPolicy(hashes, extras): construct the policy string
//   - extractScriptSrcHashes(policy): inverse — pull SHA-256 hashes
//     out of a script-src directive

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPolicy,
  extractScriptSrcHashes,
  extractStyleSrcHashes,
  sha,
} from "../scripts/csp.mjs";

test("sha computes deterministic base64 SHA-256", () => {
  const a = sha(Buffer.from("hello"));
  const b = sha(Buffer.from("hello"));
  assert.equal(a, b);
  assert.equal(typeof a, "string");
  assert.match(a, /^[A-Za-z0-9+/=]+$/);
});

test("buildPolicy emits all expected directives with hashes", () => {
  const hashes = new Set(["abc123", "def456"]);
  const policy = buildPolicy(hashes);
  // script-src has 'self' + both sha256 entries
  const m = /(?:^|;\s*)script-src\s+([^;]+)/.exec(policy);
  assert.ok(m, "script-src present");
  assert.match(m[1], /'self'/);
  assert.match(m[1], /'sha256-abc123'/);
  assert.match(m[1], /'sha256-def456'/);
  // safety: never 'unsafe-inline' in script-src
  assert.doesNotMatch(m[1], /'unsafe-inline'/);
});

test("buildPolicy never emits 'unsafe-inline' in script-src even with extras", () => {
  const policy = buildPolicy(new Set(), {
    "script-src": ["https://cdn.jsdelivr.net"],
  });
  const m = /(?:^|;\s*)script-src\s+([^;]+)/.exec(policy);
  assert.doesNotMatch(m[1], /'unsafe-inline'/);
});

test("extractScriptSrcHashes round-trips buildPolicy output", () => {
  const original = new Set(["abc123", "def456", "ghi789"]);
  const policy = buildPolicy(original);
  const extracted = extractScriptSrcHashes(policy);
  assert.equal(extracted.size, 3);
  assert.ok(extracted.has("abc123"));
  assert.ok(extracted.has("def456"));
  assert.ok(extracted.has("ghi789"));
});

test("extractScriptSrcHashes returns empty Set when no script-src directive", () => {
  const result = extractScriptSrcHashes("default-src 'self'; img-src 'self'");
  assert.equal(result.size, 0);
});

test("extractScriptSrcHashes ignores non-hash tokens like 'self' and URLs", () => {
  const policy =
    "script-src 'self' https://cdn.jsdelivr.net 'sha256-abc'; img-src 'self'";
  const result = extractScriptSrcHashes(policy);
  assert.equal(result.size, 1);
  assert.ok(result.has("abc"));
});

test("extractScriptSrcHashes detects an orphan when a hash is removed", () => {
  // Simulates the desync the post-write self-audit catches:
  // an inline-script hash exists in the source but is missing from
  // the emitted policy. The orphan-detection logic is just set-diff.
  const written = new Set(["abc123", "def456"]);
  const emitted = extractScriptSrcHashes("script-src 'self' 'sha256-abc123'");
  const orphans = [...written].filter((h) => !emitted.has(h));
  assert.deepEqual(orphans, ["def456"]);
});

test("buildPolicy preserves directive order across calls (stable for diff review)", () => {
  const a = buildPolicy(new Set(["x"]));
  const b = buildPolicy(new Set(["x"]));
  assert.equal(a, b);
});

// pt432 — inline-style hash mode tests. Mirrors the script-src hash
// pattern: every inline `<style>` block must contribute a SHA-256
// to style-src, and `'unsafe-inline'` must never appear there.
test("buildPolicy emits style-src with sha256 hashes when styleHashes provided", () => {
  const styleHashes = new Set(["sty111", "sty222"]);
  const policy = buildPolicy(new Set(), {}, styleHashes);
  const m = /(?:^|;\s*)style-src\s+([^;]+)/.exec(policy);
  assert.ok(m, "style-src present");
  assert.match(m[1], /'self'/);
  assert.match(m[1], /'sha256-sty111'/);
  assert.match(m[1], /'sha256-sty222'/);
  assert.doesNotMatch(m[1], /'unsafe-inline'/);
});

test("buildPolicy never emits 'unsafe-inline' in style-src — with or without hashes", () => {
  // Empty hash set still must not fall back to 'unsafe-inline'.
  const empty = buildPolicy(new Set(), {}, new Set());
  const mEmpty = /(?:^|;\s*)style-src\s+([^;]+)/.exec(empty);
  assert.doesNotMatch(mEmpty[1], /'unsafe-inline'/);
  // With hashes also clean.
  const hashed = buildPolicy(new Set(), {}, new Set(["xyz"]));
  const mHashed = /(?:^|;\s*)style-src\s+([^;]+)/.exec(hashed);
  assert.doesNotMatch(mHashed[1], /'unsafe-inline'/);
});

test("extractStyleSrcHashes round-trips buildPolicy output", () => {
  const original = new Set(["sty111", "sty222", "sty333"]);
  const policy = buildPolicy(new Set(), {}, original);
  const extracted = extractStyleSrcHashes(policy);
  assert.equal(extracted.size, 3);
  assert.ok(extracted.has("sty111"));
  assert.ok(extracted.has("sty222"));
  assert.ok(extracted.has("sty333"));
});

test("extractStyleSrcHashes returns empty Set when no style-src directive", () => {
  const result = extractStyleSrcHashes("default-src 'self'; img-src 'self'");
  assert.equal(result.size, 0);
});

test("extractStyleSrcHashes ignores non-hash tokens like 'self' and URLs", () => {
  const policy =
    "style-src 'self' https://cdn.jsdelivr.net/npm/@docsearch/ 'sha256-abc'; img-src 'self'";
  const result = extractStyleSrcHashes(policy);
  assert.equal(result.size, 1);
  assert.ok(result.has("abc"));
});
