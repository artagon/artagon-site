#!/usr/bin/env node
/**
 * verify-design-prerequisites.mjs
 *
 * Per `adopt-design-md-format` Phase 0.6:
 *
 *   Fails the build only when `update-site-marketing-redesign` is IN FLIGHT
 *   (directory exists at openspec/changes/update-site-marketing-redesign/,
 *   NOT archived) AND its LIVE tasks.md still references
 *   new-design/extracted/DESIGN.md paths.
 *
 *   The grep is scoped to the in-flight tasks file ONLY — historical
 *   references in proposal.md / design.md are authoring records, not
 *   build inputs, and MUST NOT trigger the failure.
 *
 *   Once the redesign archives (its directory moves to
 *   openspec/changes/archive/<timestamp>-update-site-marketing-redesign/),
 *   the script exits 0 unconditionally because the redesign is no longer
 *   in flight.
 *
 * Exit codes:
 *   0 — prerequisites satisfied (or redesign archived)
 *   1 — redesign in flight AND tasks.md references stale paths
 *   2 — usage error (cannot find openspec tree)
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = argv[2] ? argv[2] : join(__dirname, "..");

const REDESIGN_DIR = join(
  ROOT,
  "openspec/changes/update-site-marketing-redesign",
);
const REDESIGN_TASKS = join(REDESIGN_DIR, "tasks.md");
const STALE_PATH_PATTERN = /new-design\/extracted\/DESIGN\.md/g;

function main() {
  if (!existsSync(join(ROOT, "openspec"))) {
    console.error(`✗ openspec/ tree not found under ${ROOT}`);
    exit(2);
  }

  // State (c): redesign archived → exit 0 unconditionally.
  if (!existsSync(REDESIGN_DIR)) {
    console.log(
      "✓ update-site-marketing-redesign is archived; design-md prerequisites satisfied.",
    );
    exit(0);
  }

  // Redesign is in flight. Check live tasks.md for stale path references.
  if (!existsSync(REDESIGN_TASKS)) {
    console.log(
      "✓ update-site-marketing-redesign in flight but tasks.md absent; nothing to gate.",
    );
    exit(0);
  }

  const tasksBody = readFileSync(REDESIGN_TASKS, "utf8");
  const matches = tasksBody.match(STALE_PATH_PATTERN);

  // State (b): redesign in flight + tasks already updated → exit 0.
  if (!matches || matches.length === 0) {
    console.log(
      "✓ update-site-marketing-redesign in flight; tasks.md no longer references new-design/extracted/DESIGN.md.",
    );
    exit(0);
  }

  // State (a): redesign in flight + tasks reference old paths → exit 1.
  console.error(
    `✗ update-site-marketing-redesign/tasks.md references stale path "new-design/extracted/DESIGN.md" (${matches.length} occurrences).`,
  );
  console.error(
    "  This is the path before adopt-design-md-format archives. Update those references to point at the repo-root DESIGN.md.",
  );
  console.error(
    "  Note: historical references in proposal.md / design.md are authoring records and are NOT checked.",
  );
  exit(1);
}

main();
