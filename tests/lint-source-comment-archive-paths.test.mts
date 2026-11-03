// USMR Phase 5.5.16-pt258 — source-comment archive-path drift gate.
//
// pt256 found 4 files (`.github/dependabot.yml`, `scripts/sync-
// build-config.mjs`, `scripts/clean.mjs`, `.gitignore`) citing
// `openspec/changes/standardize-build-artifacts/...` in line
// comments — but that change archived 2026-05-05 to
// `openspec/changes/archive/2026-05-05-standardize-build-artifacts/`.
// pt257 found `src/scripts/tweaks-state.ts:17` citing
// `openspec/changes/add-tweaks-panel/proposal.md` in a JSDoc
// comment — same drift class (archived 2026-05-04).
//
// Both pt256 and pt257 flagged this gate as a follow-up: a
// structural check that walks source-file line comments for
// `openspec/changes/<change-id>/...` patterns and asserts the
// referenced change-id exists either at `openspec/changes/<id>/`
// (in-flight) OR at `openspec/changes/archive/<timestamp>-<id>/`
// (archived). If neither resolves, the citation is drift —
// either a typo, a deleted change, or a change that was renamed
// without the comment being updated.
//
// pt258 ships that gate. Sibling of:
//   - pt175 / pt178 / pt179 / pt180 / pt181 / pt190 / pt191 /
//     pt200 / pt201 / pt202 / pt203 — backticked path-citation
//     gates over markdown documents.
//   - pt184 / pt255 — sync gates that compare doc lists against
//     directory listings.
// Coverage gap closed: SOURCE-FILE line comments (`*.ts`,
// `*.mjs`, `*.cjs`, `*.js`, `*.yml`, `.gitignore`) where the
// markdown-prose path-citation gates don't reach.
//
// Scope:
//   - Files scanned: `src/**`, `scripts/**`, `tests/**`,
//     `.github/**`, repo-root single files (`.gitignore`,
//     `_config.yml`).
//   - Pattern matched: `openspec/changes/<id>/` where `<id>` is
//     a kebab-case identifier (NOT the literal string `archive`).
//   - Validation: `<id>` must resolve to either
//     `openspec/changes/<id>/` (in-flight) OR
//     `openspec/changes/archive/*-<id>/` (archived).
//   - HISTORICAL_ALLOW: change-ids that were never in the live
//     tree (e.g. cleanup-new-design-extracted, brand-gallery
//     placeholder) — none today; reserved for future need.
//
// The gate is structural: future archive-path drift fails CI
// before it festers across multiple files (as standardize-
// build-artifacts did over ~5 files for ~6 months).

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CHANGES = join(ROOT, "openspec", "changes");
const ARCHIVE = join(CHANGES, "archive");

// Files / dirs to scan. Globs are not used — explicit walks keep
// the gate fast and predictable. Add a directory here when a new
// source-tree top level appears (e.g. `app/` if Astro adds an
// app router).
//
// USMR Phase 5.5.16-pt353 — `rules/` added to SCAN_DIRS. pt352
// found `rules/security/no-untraceable-token.yml:26` citing
// `openspec/changes/adopt-design-md-format/tasks.md` (pre-archive
// path) for an archived proposal. Pre-pt353 the gate's SCAN_DIRS
// = ["src", "scripts", "tests", ".github"] missed `rules/`
// entirely; sg-rule .yml note-blocks could carry stale openspec
// archive-paths without surfacing.
const SCAN_DIRS = ["src", "scripts", "tests", ".github", "rules"];
const SCAN_FILES_AT_ROOT = [".gitignore", "_config.yml"];

const SCANNED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".js",
  ".yml",
  ".yaml",
]);

// HISTORICAL allow-list — change-ids cited in source comments
// that are intentionally NOT expected to resolve on disk. Each
// entry MUST tie to a documented narrative (a comment in this
// gate file, an archived proposal, or a NOT-FILED stub change).
// Empty today; reserved for future expansions.
const HISTORICAL_ALLOW = new Set<string>([
  // pt? — example placeholder (intentionally unused; populate
  // when a never-shipped change-id needs to be cited for
  // archaeology). Remove this comment when first used.
]);

function shouldScanFile(name: string): boolean {
  if (SCAN_FILES_AT_ROOT.includes(name)) return true;
  for (const ext of SCANNED_EXTENSIONS) {
    if (name.endsWith(ext)) return true;
  }
  return false;
}

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      // Skip node_modules, .build, .git, and any archive/ subtree
      // (we don't scan archive content because every reference
      // there is intentional historical record).
      if (e.name === "node_modules") continue;
      if (e.name === ".build") continue;
      if (e.name === ".git") continue;
      if (e.name === "archive") continue;
      out.push(...listFilesRecursive(abs));
    } else if (e.isFile() && shouldScanFile(e.name)) {
      out.push(abs);
    }
  }
  return out;
}

function listInFlightChanges(): Set<string> {
  const out = new Set<string>();
  if (!existsSync(CHANGES)) return out;
  for (const e of readdirSync(CHANGES, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (e.name === "archive") continue;
    out.add(e.name);
  }
  return out;
}

function listArchivedChangeIds(): Set<string> {
  // Archive directories are named `<YYYY-MM-DD>-<change-id>/`.
  // Strip the date prefix to get the change-id.
  const out = new Set<string>();
  if (!existsSync(ARCHIVE)) return out;
  for (const e of readdirSync(ARCHIVE, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const m = e.name.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
    if (m) out.add(m[1]!);
  }
  return out;
}

// Match `openspec/changes/<id>/` where <id> is kebab-case and
// does NOT start with `archive`. Captures only the change-id so
// downstream resolution is exact.
const CHANGE_REF_RE =
  /openspec\/changes\/(?!archive\b)([a-z][a-z0-9-]+)(?:\/|\b)/g;

describe("source-comment archive-path drift (pt258)", () => {
  test("openspec/ changes/ tree exists", () => {
    expect(existsSync(CHANGES), "openspec/changes/ must exist").toBe(true);
    expect(statSync(CHANGES).isDirectory()).toBe(true);
  });

  test("every openspec/changes/<id>/ reference in source resolves on disk", () => {
    const inFlight = listInFlightChanges();
    const archived = listArchivedChangeIds();

    const files: string[] = [];
    for (const d of SCAN_DIRS) {
      files.push(...listFilesRecursive(join(ROOT, d)));
    }
    for (const f of SCAN_FILES_AT_ROOT) {
      const abs = join(ROOT, f);
      if (existsSync(abs) && statSync(abs).isFile()) files.push(abs);
    }

    expect(files.length, "must scan ≥1 file").toBeGreaterThan(0);

    // path → set of unresolved change-ids. Used to render a
    // single failure message that names all drifts at once.
    const drifts: Array<{ path: string; line: number; id: string }> = [];

    for (const abs of files) {
      let body: string;
      try {
        body = readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      CHANGE_REF_RE.lastIndex = 0;
      let m;
      while ((m = CHANGE_REF_RE.exec(body)) !== null) {
        const id = m[1]!;
        if (HISTORICAL_ALLOW.has(id)) continue;
        if (inFlight.has(id)) continue;
        if (archived.has(id)) continue;
        const before = body.slice(0, m.index);
        const line = before.split("\n").length;
        drifts.push({
          path: abs.replace(ROOT, "").replace(/^\//, ""),
          line,
          id,
        });
      }
    }

    if (drifts.length > 0) {
      const formatted = drifts
        .map(
          (d) =>
            `  - ${d.path}:${d.line} cites "openspec/changes/${d.id}/" (no in-flight or archive entry)`,
        )
        .join("\n");
      throw new Error(
        `Source-comment archive-path drift: ${drifts.length} reference(s) do not resolve:\n${formatted}\n\n` +
          `Fix one of:\n` +
          `  - Update the comment to cite the archive path (e.g. "openspec/changes/archive/<YYYY-MM-DD>-<id>/...") if the change archived\n` +
          `  - Update to the new change-id if the change was renamed\n` +
          `  - Drop the reference if the change was rolled back / never shipped\n` +
          `  - If the change-id was never on disk by design, add it to HISTORICAL_ALLOW with a documented rationale comment\n`,
      );
    }

    expect(drifts.length).toBe(0);
  });
});
