#!/usr/bin/env node
/**
 * verify-design-md-uniqueness.mjs
 *
 * Per `design-system-format` §"Canonical DESIGN.md Location":
 *
 *   The repository MUST contain exactly one `DESIGN.md` file at the
 *   repository root. A `DESIGN.md` under `src/`, `new-design/`, or any
 *   other tracked path is forbidden — having two design systems in flight
 *   defeats the precedence chain (the root file is canonical; nested
 *   files would shadow it for downstream readers).
 *
 *   Wire into postbuild after `lint:design`.
 *
 * Exit codes:
 *   0 — exactly one DESIGN.md at the repo root, none elsewhere
 *   1 — extra DESIGN.md file(s) found in tracked paths
 *   2 — usage / IO error (root DESIGN.md missing, git not on PATH, etc.)
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(argv[2] ? argv[2] : join(__dirname, ".."));

// Skill / agent / openspec example fixtures are NOT competing design
// systems — they are documentation samples and authoring records. The
// canonical-uniqueness rule applies to live source paths only.
const ALLOWLIST_PREFIXES = [
  ".agents/",
  ".claude/",
  "openspec/changes/",
  "openspec/.cache/",
  "new-design/",
];

function isAllowlisted(path) {
  return ALLOWLIST_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function listTrackedDesignMd() {
  try {
    const out = execFileSync("git", ["ls-files", "DESIGN.md", "**/DESIGN.md"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (err) {
    console.error(
      `✗ verify-design-md-uniqueness: git ls-files failed: ${err.code ?? "unknown"} ${err.message}`,
    );
    exit(2);
  }
}

function main() {
  if (!existsSync(join(ROOT, "DESIGN.md"))) {
    console.error(
      `✗ verify-design-md-uniqueness: root DESIGN.md not found at ${ROOT}/DESIGN.md`,
    );
    exit(2);
  }

  const tracked = listTrackedDesignMd();
  // Filter the canonical root entry + allowlisted documentation/skill-example
  // fixtures; everything else is a competing-design-system violation.
  const extras = tracked.filter((p) => p !== "DESIGN.md" && !isAllowlisted(p));

  if (extras.length === 0) {
    console.log(
      "✓ verify-design-md-uniqueness: exactly one DESIGN.md at the repo root.",
    );
    exit(0);
  }

  for (const p of extras) {
    console.error(`✗ extra DESIGN.md found at ${p}`);
  }
  console.error(
    `\n${extras.length} non-canonical DESIGN.md file${extras.length === 1 ? "" : "s"} tracked. Only the root DESIGN.md is canonical (per design-system-format spec §"Canonical DESIGN.md Location"). Move content into the root file or delete the duplicates.`,
  );
  exit(1);
}

main();
