#!/usr/bin/env node
/**
 * verify-design-md-telemetry.mjs
 *
 * Per `adopt-design-md-format` Phase 2.10 (proposal archived
 * 2026-05-05 to `openspec/changes/archive/2026-05-05-adopt-design-md-format/`;
 * the live spec is `openspec/specs/design-system-format/spec.md`):
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

import { spawnSync } from "node:child_process";
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
    // pt444 — surface spawn-level failures explicitly. `result.error`
    // is set when spawn itself failed (ENOENT on the binary, EACCES,
    // etc.); `result.signal` is set when the process was killed by a
    // signal (`status` is `null` in that case). Pre-pt444 these hit
    // the "lint failed in isolated namespace" branch and printed
    // confusing `(exit null)` / `stderr: undefined`. Now both are
    // disambiguated and exit 1 with actionable diagnostics.
    if (result.error) {
      console.error(
        `✗ unshare spawn failed: ${result.error.code ?? "unknown"} ${result.error.message}`,
      );
      console.error(
        "  Check that /usr/bin/unshare exists and has execute permission.",
      );
      exit(1);
    }
    if (result.signal) {
      console.error(
        `✗ unshare killed by signal ${result.signal} (status=${result.status})`,
      );
      console.error(`  stderr: ${result.stderr ?? "(empty)"}`);
      console.error("  Process did not exit normally; treat as inconclusive.");
      exit(1);
    }
    // Disambiguate `unshare` failing to create the namespace
    // (CAP_SYS_ADMIN missing on the runner — unprivileged GitHub
    // Actions Linux runners hit this) from the wrapped lint
    // failing inside a successfully-isolated namespace. The first
    // case is an environment limitation: fall through to Docker.
    // The second case is a real telemetry leak: hard fail.
    const unshareEnvLimitation =
      result.stderr &&
      /unshare:\s*unshare failed:\s*Operation not permitted/.test(
        result.stderr,
      );
    if (unshareEnvLimitation) {
      console.warn(
        "⚠ `unshare -n` is not permitted on this runner (no CAP_SYS_ADMIN).",
      );
      console.warn("  Falling back to `docker --network=none` if available.");
    } else {
      console.error(
        `✗ lint failed in isolated network namespace (exit ${result.status})`,
      );
      console.error(`  stderr: ${result.stderr ?? "(empty)"}`);
      console.error(
        "  This suggests the CLI made an outbound network call. Investigate.",
      );
      exit(1);
    }
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
      // pt439-followup: package's actual entry is `dist/index.js`
      // per package.json:bin (`design.md` → `./dist/index.js`).
      // The pre-pt439 hardcoded `dist/cli.js` doesn't exist (the
      // CLI doubles as the lib's main entry; argv routing happens
      // inside index.js).
      "node_modules/@google/design.md/dist/index.js",
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
