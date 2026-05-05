#!/usr/bin/env node
/**
 * verify-prerequisites.mjs
 *
 * Per `update-site-marketing-redesign` Phase 0.5:
 *
 *   Fails the build unless `openspec/changes/refactor-styling-architecture/`
 *   is archived (entry exists at
 *   `openspec/changes/archive/<timestamp>-refactor-styling-architecture/`)
 *   OR its merge commit is an ancestor of HEAD.
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
 *   2 — usage error (cannot find openspec tree, git not available, etc.)
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = argv[2] ? argv[2] : join(__dirname, "..");

const STYLING_DIR = join(
  ROOT,
  "openspec/changes/refactor-styling-architecture",
);
const ARCHIVE_DIR = join(ROOT, "openspec/changes/archive");

// Returns true if openspec/changes/archive/ contains a directory whose name
// ends in `-refactor-styling-architecture` (the openspec archive convention
// is `<timestamp>-<change-id>`).
function isStylingArchived() {
  if (!existsSync(ARCHIVE_DIR)) return false;
  try {
    return readdirSync(ARCHIVE_DIR).some((entry) => {
      if (!entry.endsWith("-refactor-styling-architecture")) return false;
      try {
        return statSync(join(ARCHIVE_DIR, entry)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

// Returns true if there's a commit on HEAD's history whose subject mentions
// "refactor-styling-architecture: archive" (the canonical archive-commit
// pattern). This handles the case where the archive directory is renamed or
// moved but the merge commit still lives in history.
function hasStylingArchiveAncestor() {
  try {
    const log = execFileSync(
      "git",
      ["log", "--oneline", "--grep=refactor-styling-architecture", "-n", "5"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return /archive/i.test(log);
  } catch {
    return false;
  }
}

function main() {
  if (!existsSync(join(ROOT, "openspec"))) {
    console.error(`✗ openspec/ tree not found under ${ROOT}`);
    exit(2);
  }

  const inFlight = existsSync(STYLING_DIR);
  const archived = isStylingArchived();
  const hasAncestor = hasStylingArchiveAncestor();

  // State (a): refactor-styling-architecture archived → exit 0.
  if (archived) {
    console.log(
      "✓ refactor-styling-architecture archived (entry found in openspec/changes/archive/); USMR prerequisites satisfied.",
    );
    exit(0);
  }

  // State (b): not in flight + commit-history evidence of archive → exit 0.
  // This covers the case where someone moved the archive directory but the
  // merge commit is still on HEAD.
  if (!inFlight && hasAncestor) {
    console.log(
      "✓ refactor-styling-architecture archive commit is an ancestor of HEAD; USMR prerequisites satisfied.",
    );
    exit(0);
  }

  // State (c): refactor-styling-architecture neither archived nor present in
  // history. Refuse to pass; surface as exit 2 (incomplete openspec tree).
  if (!inFlight && !hasAncestor) {
    console.error(
      "✗ refactor-styling-architecture is neither archived nor in flight, and no archive commit found in HEAD's history. The openspec tree appears incomplete.",
    );
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
