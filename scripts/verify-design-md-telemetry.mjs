#!/usr/bin/env node
/**
 * verify-design-md-telemetry.mjs
 *
 * Per `adopt-design-md-format` Phase 2.10:
 *   `npm run lint:design` MUST make zero outbound network calls.
 *   Assert via `unshare -n` (Linux CI) or by running the lint inside a
 *   Docker container with `--network=none`.
 *
 * Strategy:
 *   - Linux: spawn `unshare -n -- design.md lint DESIGN.md` and assert exit 0
 *     (no network namespace = no outbound DNS/sockets possible).
 *   - macOS local: skip with a warning — Linux CI is the gate.
 *   - Docker fallback: spawn a node:22-alpine container with --network=none
 *     and the project mounted, run the lint, assert exit 0.
 *
 * Exit codes:
 *   0 — lint succeeded with no network access
 *   1 — lint failed (suggesting network was needed → telemetry leak)
 *   2 — environment unsupported (no unshare/no docker on the platform)
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { platform, exit, env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DESIGN_MD = join(ROOT, "DESIGN.md");
const CLI = join(ROOT, "node_modules", ".bin", "design.md");

if (!existsSync(DESIGN_MD)) {
  console.error(`✗ DESIGN.md not found at ${DESIGN_MD}`);
  exit(1);
}
if (!existsSync(CLI)) {
  console.error(`✗ @google/design.md CLI not found at ${CLI}`);
  exit(1);
}

const FORCE_DOCKER = env.FORCE_DOCKER === "1";
const FORCE_LINUX = env.FORCE_LINUX === "1";

// ---------- Linux: unshare -n ----------

if (platform === "linux" || FORCE_LINUX) {
  const which = spawnSync("which", ["unshare"], { encoding: "utf8" });
  if (which.status === 0) {
    console.log(
      "→ verifying via `unshare -n` (Linux network-namespace isolation)...",
    );
    const result = spawnSync("unshare", ["-n", "--", CLI, "lint", DESIGN_MD], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status === 0) {
      console.log(
        "✓ telemetry verified: lint exit 0 inside isolated network namespace",
      );
      exit(0);
    }
    console.error(
      `✗ lint failed in isolated network namespace (exit ${result.status})`,
    );
    console.error(`  stderr: ${result.stderr}`);
    console.error(
      "  This suggests the CLI made an outbound network call. Investigate.",
    );
    exit(1);
  }
}

// ---------- Docker fallback ----------

const dockerWhich = spawnSync("which", ["docker"], { encoding: "utf8" });
if (dockerWhich.status === 0 || FORCE_DOCKER) {
  console.log(
    "→ verifying via `docker run --network=none` (cross-platform isolation)...",
  );
  // We mount the project read-only. Use the same Node version pinned in .nvmrc.
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--network=none",
      "--read-only",
      "--mount",
      `type=bind,source=${ROOT},target=/work,readonly`,
      "-w",
      "/work",
      "node:22-alpine",
      "node",
      "node_modules/@google/design.md/dist/cli.js",
      "lint",
      "DESIGN.md",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status === 0) {
    console.log(
      "✓ telemetry verified: lint exit 0 inside --network=none container",
    );
    exit(0);
  }
  console.error(
    `✗ lint failed in --network=none container (exit ${result.status})`,
  );
  console.error(`  stderr: ${result.stderr}`);
  exit(1);
}

console.warn(
  "⚠ neither `unshare -n` (Linux) nor `docker` available — telemetry verification skipped.",
);
console.warn(
  "  This script runs as a positive gate in CI (Linux); local macOS runs may not enforce it.",
);
exit(2);
