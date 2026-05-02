#!/usr/bin/env node
// Lock-aware clean helper for .build/. Argv: all|cache|reports.
// Exit codes: 0 success, 64 EX_USAGE, 73 EX_CANTCREAT (lock held), 1 fs error.
// See openspec/changes/standardize-build-artifacts/specs/build-config/spec.md.

import {
  existsSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
} from "node:fs";
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
const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
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
