#!/usr/bin/env node
// Lock-aware clean helper for .build/. Argv: all|cache|reports.
// Exit codes: 0 success, 64 EX_USAGE, 73 EX_CANTCREAT (lock held), 1 fs error.
// See openspec/specs/build-config/spec.md (originally authored in the
// archived openspec/changes/archive/2026-05-05-standardize-build-artifacts/
// proposal — its `build-config` capability is now the live spec).

import { existsSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit } from "node:process";
import { hostname } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BUILD = join(ROOT, ".build");
const LOCK = join(BUILD, ".run.lock");

const target = argv[2];
const VALID = new Set(["all", "cache", "reports"]);
if (!target || !VALID.has(target)) {
  console.error("usage: clean.mjs <all|cache|reports>");
  exit(64);
}

// ---------- Lock check ----------
import { execFileSync } from "node:child_process";
const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours
const PID_REUSE_WINDOW_MS = 60 * 1000; // 1 minute slack for clock skew

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Returns the process's start time as a unix-ms timestamp, or null if the
// PID is dead or `ps` is unavailable. Used to detect PID-reuse: if a lock
// file says "PID 12345 at t=1000" but PID 12345's actual start time is
// t=2000, the process running today is NOT the one that took the lock.
function pidStartTimeMs(pid) {
  try {
    const out = execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!out) return null;
    const t = Date.parse(out);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

function checkLock() {
  if (!existsSync(LOCK)) return { held: false };
  let content;
  try {
    content = readFileSync(LOCK, "utf8").trim();
  } catch {
    return { held: false };
  }
  const [lockHost, pidStr, tsStr] = content.split(":");
  const pid = parseInt(pidStr, 10);
  const ts = parseInt(tsStr, 10);
  const now = Date.now();
  const ageMs = now - ts;

  if (ageMs > STALE_MS) {
    try {
      unlinkSync(LOCK);
    } catch {}
    return { held: false, note: "stale by age" };
  }
  if (lockHost !== hostname()) {
    return { held: true, reason: `foreign-host lock (${lockHost})` };
  }
  // PID-reuse defense: if `ps` reports a start time, the lock-taker MUST
  // have started before (or within slack of) the lock timestamp. Reused
  // PIDs (process exited, OS recycled the number) have a later start
  // time. When ps is unavailable (rare unix), fall back to bare PID-alive.
  const startMs = pidStartTimeMs(pid);
  if (startMs !== null && startMs > ts + PID_REUSE_WINDOW_MS) {
    try {
      unlinkSync(LOCK);
    } catch {}
    return { held: false, note: "stale: PID reused" };
  }
  if (!pidAlive(pid)) {
    try {
      unlinkSync(LOCK);
    } catch {}
    return { held: false, note: "stale: dead PID" };
  }
  return { held: true, reason: `live PID ${pid} on ${lockHost}` };
}

const lock = checkLock();
if (lock.held) {
  console.error(
    `✗ tests in flight (${lock.reason}); refusing to delete ${target}`,
  );
  exit(73);
}
if (lock.note) console.log(`note: cleared ${lock.note}`);

// ---------- Clean ----------
const paths = {
  all: BUILD,
  cache: join(BUILD, "cache"),
  reports: join(BUILD, "reports"),
};

const path = paths[target];
if (existsSync(path)) {
  try {
    rmSync(path, { recursive: true, force: true });
    console.log(`✓ cleaned ${path}`);
  } catch (err) {
    console.error(`✗ failed to clean ${path}: ${err.message}`);
    exit(1);
  }
} else {
  console.log(`✓ ${path} did not exist`);
}
