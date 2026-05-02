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

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
const ARCHIVE_DIR = join(ROOT, "openspec/changes/archive");
const STALE_PATH_PATTERN = /new-design\/extracted\/DESIGN\.md/g;

// Returns true if openspec/changes/archive/ contains a directory whose name
// ends in `-update-site-marketing-redesign` (the openspec archive convention
// is `<timestamp>-<change-id>`).
function isRedesignArchived() {
  if (!existsSync(ARCHIVE_DIR)) return false;
  try {
    return readdirSync(ARCHIVE_DIR).some((entry) => {
      if (!entry.endsWith("-update-site-marketing-redesign")) return false;
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

function main() {
  if (!existsSync(join(ROOT, "openspec"))) {
    console.error(`✗ openspec/ tree not found under ${ROOT}`);
    exit(2);
  }

  const inFlight = existsSync(REDESIGN_DIR);
  const archived = isRedesignArchived();

  // State (c): redesign archived → exit 0 unconditionally.
  // We require positive evidence of an archive entry (not just the absence
  // of the in-flight directory) so a missing/empty openspec tree doesn't
  // silently pass the gate.
  if (archived) {
    console.log(
      "✓ update-site-marketing-redesign is archived (entry found in openspec/changes/archive/); design-md prerequisites satisfied.",
    );
    exit(0);
  }

  // Redesign is neither archived nor in flight — likely an empty/incomplete
  // openspec tree. Refuse to silently pass; surface as exit 2 (usage).
  if (!inFlight) {
    console.error(
      "✗ update-site-marketing-redesign is neither in flight (openspec/changes/) nor archived (openspec/changes/archive/). The openspec tree appears incomplete.",
    );
    exit(2);
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
