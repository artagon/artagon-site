// Shared helper for openspec prerequisite-verification scripts.
//
// The openspec archive convention is `<timestamp>-<change-id>` directory
// names under `openspec/changes/archive/`. Two scripts (and a third in
// flight) verify that a specific change has been archived before allowing
// dependent work to land. Rather than duplicate the directory walk in
// each script, this helper centralizes:
//
//   - the archive directory layout
//   - what counts as a valid archive entry (must be a directory, not a
//     stray file)
//   - error semantics: read failures (EACCES, EMFILE, EIO, ENOTDIR) are
//     surfaced as **errors**, not silently treated as "not archived" —
//     hiding a permission denial behind "in flight" gives users a
//     wrong remediation path ("re-archive a change that's already
//     archived").
//
// Consumers:
//   - scripts/verify-design-prerequisites.mjs (adopt-design-md-format)
//   - scripts/verify-prerequisites.mjs (update-site-marketing-redesign)
//   - scripts/verify-writing-prerequisites.mjs (add-brand-assets-and-
//     writing-pipeline, future)
//
// Per the cross-cutting review's finding #4, all three scripts should
// eventually consolidate behind one `verify:openspec-prereqs --change <id>`
// runner. This helper paves that path without preempting that change's
// design.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Returns true if `openspec/changes/archive/` contains a directory whose
 * name ends in `-<changeName>` (the openspec convention).
 *
 * Throws an Error with `code` set to the underlying fs error code on
 * permission/IO failures. Callers should treat thrown errors as exit-2
 * (usage / environment) and the boolean return as exit-0/exit-1
 * decisions.
 *
 * @param {string} changeName - kebab-case openspec change id
 * @param {string} root - repo root (the parent of `openspec/`)
 * @returns {boolean} true if archived; false if archive dir is absent
 *   OR no entry matches the convention
 */
export function isChangeArchived(changeName, root) {
  const archiveDir = join(root, "openspec/changes/archive");
  if (!existsSync(archiveDir)) return false;

  // Read the archive directory. Permission denial / handle exhaustion are
  // distinct from "no entry found" — we re-throw so the caller can surface
  // an explicit usage error instead of silently treating it as "not
  // archived" (which would mis-direct the user to re-archive an already-
  // archived change).
  const entries = readdirSync(archiveDir);

  const suffix = `-${changeName}`;
  for (const entry of entries) {
    if (!entry.endsWith(suffix)) continue;
    // Per-entry stat: if a stray file shares the suffix, skip it. If the
    // stat fails for permission reasons, re-throw — same logic as the
    // readdir step.
    if (statSync(join(archiveDir, entry)).isDirectory()) {
      return true;
    }
  }
  return false;
}
