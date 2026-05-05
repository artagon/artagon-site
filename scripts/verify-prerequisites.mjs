#!/usr/bin/env node
/**
 * verify-prerequisites.mjs
 *
 * Per `update-site-marketing-redesign` Phase 0.5:
 *
 *   Fails the build unless `openspec/changes/refactor-styling-architecture/`
 *   is archived (entry exists at
 *   `openspec/changes/archive/<timestamp>-refactor-styling-architecture/`)
 *   OR its archive merge SHA is an ancestor of HEAD.
 *
 *   The redesign work consumes the styling refactor's tokens, utility
 *   classes, and BaseLayout slot ABI; landing redesign code on a tree
 *   that doesn't have those ancestors will produce token-resolution
 *   failures + missing-component build errors. This gate is the
 *   pre-merge fence that catches the regression.
 *
 *   Wire into postbuild and PR CI per the redesign's spec.
 *
 * Exit codes:
 *   0 — prerequisites satisfied (refactor-styling-architecture archived
 *       or its commit is an ancestor of HEAD)
 *   1 — refactor-styling-architecture is in flight (openspec/changes/
 *       directory exists) AND not yet archived AND its merge SHA is not
 *       an ancestor of HEAD
 *   2 — usage error (cannot find openspec tree, ROOT not a directory,
 *       git binary missing on PATH, FS read errors, etc.)
 */

import { existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";
import { execFileSync } from "node:child_process";
import { isChangeArchived } from "./lib/openspec-archive.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// LO-1: resolve to absolute so error messages echo a usable path. If
// argv[2] is provided, use it; otherwise default to the repo root
// derived from this script's location.
const ROOT = resolve(argv[2] ? argv[2] : join(__dirname, ".."));

// PR #39 squash-merge commit. This is the canonical ancestor for the
// "refactor-styling-architecture archived" condition. Pinning a SHA
// (instead of grepping commit messages) makes the gate deterministic
// and immune to subject-line wording changes.
//
// VERIFY_PREREQ_ARCHIVE_SHA may be set by tests to override the
// production SHA. This allows state-(b) tests to plant a locally-created
// commit without fetching from the upstream repo (needed in shallow
// clone environments where the original SHA is not reachable).
const STYLING_ARCHIVE_SHA =
  process.env.VERIFY_PREREQ_ARCHIVE_SHA ??
  "989e5c4fa01db092ea560f5b39f2857bc438d236";

const STYLING_DIR = join(
  ROOT,
  "openspec/changes/refactor-styling-architecture",
);

const REMEDIATION_HINT_FOR_ROOT_PATH =
  "  If you intended to run against a different repo, pass its path as argv[2]:\n" +
  "    node scripts/verify-prerequisites.mjs /path/to/repo";

// Returns one of:
//   "ancestor" — pinned SHA is an ancestor of HEAD (gate passes)
//   "not-ancestor" — pinned SHA exists but is not in HEAD's history
//   "no-repo" — ROOT is not a git repo (gate falls back to dir check)
//   "no-git" — git binary not found on PATH (caller MUST exit 2; we
//       cannot verify the ancestor relationship without git)
function checkStylingAncestor() {
  let result;
  try {
    result = execFileSync(
      "git",
      ["merge-base", "--is-ancestor", STYLING_ARCHIVE_SHA, "HEAD"],
      {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10_000,
      },
    );
    // exit 0: SHA is an ancestor.
    return "ancestor";
  } catch (err) {
    if (err.code === "ENOENT") {
      return "no-git";
    }
    if (err.code === "ETIMEDOUT") {
      console.error(
        `⚠ git merge-base timed out after 10s under ${ROOT}; treating as not-ancestor.`,
      );
      return "not-ancestor";
    }
    // git merge-base --is-ancestor exits 1 when the SHA is NOT an
    // ancestor of HEAD; exits 128 when the SHA is unknown OR the cwd is
    // not a repo. Distinguish these so the caller can fall back gracefully.
    const stderr = err.stderr?.toString() ?? "";
    if (
      stderr.includes("not a git repository") ||
      stderr.includes("Not a git repository")
    ) {
      return "no-repo";
    }
    if (stderr.includes("Not a valid object name")) {
      // The pinned SHA isn't in this clone — likely a shallow clone or a
      // repo split. Treat as "not ancestor" so the caller can fall back
      // to the archive-dir check, but warn so the user knows the gate
      // is degraded.
      console.error(
        `⚠ pinned archive SHA ${STYLING_ARCHIVE_SHA} not present in this clone (shallow clone? repo split?).`,
      );
      console.error(
        "  Falling back to archive-directory check only. Add `fetch-depth: 0` to the CI checkout step to re-enable the ancestor gate.",
      );
      return "not-ancestor";
    }
    // exit 1 = "not an ancestor" (legitimate signal from git).
    if (typeof err.status === "number" && err.status === 1) {
      return "not-ancestor";
    }
    // Unknown failure — surface it.
    console.error(
      `⚠ git merge-base failed (${err.code ?? "unknown"}): ${stderr.split("\n")[0] || err.message}`,
    );
    return "not-ancestor";
  }
}

function main() {
  if (!existsSync(ROOT) || !statSync(ROOT).isDirectory()) {
    console.error(`✗ ROOT path is not a directory: ${ROOT}`);
    console.error(REMEDIATION_HINT_FOR_ROOT_PATH);
    exit(2);
  }
  if (!existsSync(join(ROOT, "openspec"))) {
    console.error(`✗ openspec/ tree not found under ${ROOT}`);
    console.error(REMEDIATION_HINT_FOR_ROOT_PATH);
    exit(2);
  }

  const inFlight = existsSync(STYLING_DIR);

  // Read failures here surface as exit-2 (usage), not exit-1 (in flight).
  // Mis-direction would tell the user to re-archive an already-archived
  // change — wrong remediation path.
  let archived;
  try {
    archived = isChangeArchived("refactor-styling-architecture", ROOT);
  } catch (err) {
    console.error(
      `✗ failed to read openspec/changes/archive/ under ${ROOT}: ${err.code ?? "unknown"} ${err.message}`,
    );
    console.error(
      "  This is an environment / permissions error, not an openspec ordering issue.",
    );
    exit(2);
  }

  // State (a): refactor-styling-architecture archived → exit 0.
  if (archived) {
    console.log(
      "✓ refactor-styling-architecture archived (entry found in openspec/changes/archive/); USMR prerequisites satisfied.",
    );
    exit(0);
  }

  // State (b): not in flight + commit-history evidence of archive → exit 0.
  // This covers the case where someone moved the archive directory but the
  // pinned merge commit is still on HEAD.
  if (!inFlight) {
    const ancestorState = checkStylingAncestor();
    if (ancestorState === "no-git") {
      console.error(
        "✗ git binary not found on PATH; cannot verify archive ancestor relationship.",
      );
      console.error(
        "  Install git, or run in an environment where git is available.",
      );
      exit(2);
    }
    if (ancestorState === "ancestor") {
      console.log(
        `✓ refactor-styling-architecture archive commit (${STYLING_ARCHIVE_SHA.slice(0, 12)}) is an ancestor of HEAD; USMR prerequisites satisfied.`,
      );
      exit(0);
    }
    // ancestorState in { "not-ancestor", "no-repo" } — fall through to the
    // "neither archived nor in flight" exit-2 below.
    console.error(
      "✗ refactor-styling-architecture is neither archived nor in flight, and its archive commit is not an ancestor of HEAD. The openspec tree appears incomplete.",
    );
    console.error(
      "  Possible causes: shallow clone (set fetch-depth: 0 in CI checkout), repo split, or genuine missing prerequisite.",
    );
    console.error(REMEDIATION_HINT_FOR_ROOT_PATH);
    exit(2);
  }

  // State (d): in flight (directory exists at openspec/changes/) and no
  // archive evidence — the redesign cannot land yet.
  console.error(
    "✗ refactor-styling-architecture is in flight (openspec/changes/refactor-styling-architecture/ exists) but not yet archived.",
  );
  console.error(
    "  USMR depends on the styling refactor's tokens, utility classes, and BaseLayout slot ABI.",
  );
  console.error(
    "  Archive refactor-styling-architecture first via `openspec archive refactor-styling-architecture --yes`.",
  );
  exit(1);
}

main();
