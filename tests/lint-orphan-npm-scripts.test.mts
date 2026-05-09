// USMR Phase 5.5.16-pt183 — orphan npm scripts gate.
//
// Every npm script defined in `package.json` MUST have at least
// one consumer: a `npm run <name>` invocation in CI workflows /
// docs / scripts / postbuild composition, OR an automatic
// invocation via the npm lifecycle (pre/post hooks, `prepare`).
//
// Pre-pt183 five scripts were orphan:
//   1. `test:design-prerequisites` — convenience alias; the same
//      test file is enumerated by `test:node`. Kept as ad-hoc
//      single-test runner for local dev.
//   2. `test:lint-tokens` — same shape as #1.
//   3. `verify:font-self-hosting` — defined as alias, but the
//      postbuild chain calls the underlying script directly via
//      `node scripts/verify-font-self-hosting.mjs` (raw node).
//      Kept for ad-hoc verification + as the spec-cited entry
//      point per `self-host-woff2-fonts/specs/font-self-hosting`.
//   4. `verify:design-md-telemetry` — defined; archived
//      `adopt-design-md-format` Phase 2.10 contract claimed CI
//      runs it but no workflow actually did. pt183 wired it into
//      `.github/workflows/design-md-lint.yml` after `lint:design`,
//      closing the documentation-vs-implementation drift.
//   5. `prepare` — npm lifecycle hook (auto-invoked by
//      `npm install`); orphan only by the simple-grep heuristic.
//
// Same drift class as pt178/179/180/181 (path-citations stale)
// but pivoted to npm-script-alias staleness — the package.json
// lies about what's wired versus what's just defined.
//
// pt183 wired #4 + locks the contract here. The gate maintains
// an explicit allow-list (with per-entry rationale) for the
// remaining 4 scripts whose orphan status is intentional.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function gatherSources(dir: string, out: string[]) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".astro" ||
        entry.name === ".build"
      ) {
        continue;
      }
      gatherSources(p, out);
    } else if (/\.(yml|yaml|md|sh|mjs|mts|ts|js|json|toml)$/.test(entry.name)) {
      out.push(p);
    }
  }
}

// Top-level entry-points that contributors run directly. These
// are the "front-door" scripts (no caller required).
const TOP_LEVEL = new Set<string>([
  "dev",
  "start",
  "build",
  "preview",
  "test",
  "lint",
  "format",
  "check",
  "validate",
  "verify",
  "sync",
  "clean",
]);

// npm lifecycle hooks (auto-invoked outside of `npm run` syntax).
// Reference: https://docs.npmjs.com/cli/v10/using-npm/scripts
const NPM_LIFECYCLE = new Set<string>([
  "preinstall",
  "install",
  "postinstall",
  "prepublish",
  "preprepare",
  "prepare",
  "postprepare",
  "prepublishOnly",
  "prepack",
  "postpack",
]);

// Allow-list: scripts whose orphan status is intentional. Each
// entry MUST document WHY the script exists with no caller.
const ALLOWED_ORPHANS: Record<string, string> = {
  "test:design-prerequisites":
    "Convenience alias for ad-hoc local single-test runs; the same file is enumerated by `test:node` (the CI-driven aggregate).",
  "test:lint-tokens":
    "Convenience alias for ad-hoc local single-test runs; the same file is enumerated by `test:node`.",
  "verify:font-self-hosting":
    "Postbuild chain calls the underlying `scripts/verify-font-self-hosting.mjs` directly via raw node (the npm-script alias is the spec-cited entry point per `self-host-woff2-fonts/specs/font-self-hosting`, kept for ad-hoc verification).",
};

describe("orphan npm scripts gate (pt183)", () => {
  test("every package.json script has a caller, an npm-lifecycle hook, or an allow-list rationale", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const scripts = Object.keys(pkg.scripts || {}) as string[];
    expect(scripts.length, "expected at least one npm script").toBeGreaterThan(
      0,
    );

    // Auto-invoked: pre<X> / post<X> where <X> is also a defined
    // script (npm runs the pre/post hook around <X>).
    const autoInvoked = new Set<string>();
    for (const s of scripts) {
      if (s.startsWith("pre")) {
        const target = s.slice(3);
        if (scripts.includes(target)) autoInvoked.add(s);
      }
      if (s.startsWith("post")) {
        const target = s.slice(4);
        if (scripts.includes(target)) autoInvoked.add(s);
      }
    }

    // Build a corpus of every CI / doc / script / source file that
    // could invoke a script via `npm run <name>`.
    const consumerFiles: string[] = [];
    gatherSources(join(ROOT, ".github"), consumerFiles);
    gatherSources(join(ROOT, "scripts"), consumerFiles);
    gatherSources(join(ROOT, "docs"), consumerFiles);
    gatherSources(join(ROOT, "openspec"), consumerFiles);
    gatherSources(join(ROOT, "tests"), consumerFiles);
    gatherSources(join(ROOT, "src"), consumerFiles);
    for (const top of ["AGENTS.md", "README.md", "DESIGN.md", "package.json"]) {
      const p = join(ROOT, top);
      if (existsSync(p) && statSync(p).isFile()) consumerFiles.push(p);
    }
    const corpus = consumerFiles.map((p) => readFileSync(p, "utf8")).join("\n");

    const orphans: string[] = [];
    const orphanReasons: string[] = [];

    for (const s of scripts) {
      if (autoInvoked.has(s)) continue;
      if (TOP_LEVEL.has(s)) continue;
      if (NPM_LIFECYCLE.has(s)) continue;

      // Direct invocation: `npm run <s>` somewhere in the corpus.
      const escaped = s.replace(/[:.]/g, "\\$&");
      const directRe = new RegExp(`\\bnpm run ${escaped}\\b`);
      if (directRe.test(corpus)) continue;

      // Composed: another script body invokes `npm run <s>`.
      const composed = Object.entries(
        pkg.scripts as Record<string, string>,
      ).some(([k, v]) => k !== s && v.includes(`npm run ${s}`));
      if (composed) continue;

      // Allow-listed orphan with documented rationale.
      if (Object.prototype.hasOwnProperty.call(ALLOWED_ORPHANS, s)) continue;

      orphans.push(s);
      orphanReasons.push(`  - ${s}`);
    }

    if (orphans.length > 0) {
      throw new Error(
        `${orphans.length} npm script(s) defined in package.json have no caller and no allow-list rationale:\n` +
          orphanReasons.join("\n") +
          `\n\nFix one of:\n` +
          `  - Wire the script into a CI workflow / postbuild chain / docs reference (\`npm run <name>\`)\n` +
          `  - Compose another script to invoke it (\`"foo": "npm run <name> && ..."\`)\n` +
          `  - Add to ALLOWED_ORPHANS in this test with a one-line rationale (e.g. ad-hoc convenience alias, lifecycle bypass)\n` +
          `  - Delete the script (per CLAUDE.md: "If you are certain that something is unused, you can delete it completely.")\n`,
      );
    }

    expect(orphans.length).toBe(0);
  });
});
