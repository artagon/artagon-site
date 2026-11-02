// modernize-build-pipeline 3.1 (site-j2l.4): bind CI artifacts to their producer and bytes.
import { createHash } from "node:crypto";
import {
  appendFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BUILD } from "../build.config.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const INPUTS = ["package-lock.json", "build.config.json", "astro.config.ts"];
const manifestPath = join(
  ROOT,
  BUILD.reports.buildProvenance,
  "provenance.json",
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function requiredEnv(name, pattern) {
  const value = process.env[name];
  if (!value || (pattern && !pattern.test(value))) {
    throw new Error(`Missing or invalid ${name}`);
  }
  return value;
}

function fileDigest(path) {
  // Artifacts contain regular files; do not silently hash symlink targets or devices.
  if (!lstatSync(path).isFile()) throw new Error(`Not a regular file: ${path}`);
  return sha256(readFileSync(path));
}

function distFiles() {
  const base = join(ROOT, BUILD.dist);
  const files = [];
  function walk(dir, prefix = "") {
    if (!lstatSync(dir).isDirectory())
      throw new Error(`Not a directory: ${dir}`);
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      const relative = prefix ? `${prefix}/${name}` : name;
      const stat = lstatSync(path);
      if (stat.isDirectory()) walk(path, relative);
      else files.push([relative, fileDigest(path)]);
    }
  }
  walk(base);
  if (files.length === 0) throw new Error("Build output contains no files");
  return Object.fromEntries(files);
}

function inputDigests() {
  return Object.fromEntries(
    INPUTS.map((path) => [path, fileDigest(join(ROOT, path))]),
  );
}

function assertMap(actual, recorded, label) {
  if (!recorded || typeof recorded !== "object" || Array.isArray(recorded)) {
    throw new Error(`Invalid ${label} map`);
  }
  const keys = Object.keys(actual).sort();
  if (JSON.stringify(keys) !== JSON.stringify(Object.keys(recorded).sort())) {
    throw new Error(`${label} file set mismatch`);
  }
  for (const key of keys) {
    if (actual[key] !== recorded[key])
      throw new Error(`${label} digest mismatch: ${key}`);
  }
}

function main() {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !["--write", "--verify"].includes(mode)) {
    throw new Error(
      "Usage: node scripts/verify-build-provenance.mjs --write|--verify",
    );
  }
  const sha = requiredEnv("GITHUB_SHA", /^[0-9a-f]{40}$/i);
  const runId = requiredEnv("GITHUB_RUN_ID", /^[1-9][0-9]*$/);
  if (mode === "--write") {
    const producerRunAttempt = requiredEnv(
      "GITHUB_RUN_ATTEMPT",
      /^[1-9][0-9]*$/,
    );
    const output = requiredEnv("GITHUB_OUTPUT");
    const manifest = {
      sha,
      runId,
      producerRunAttempt,
      nodeVersion: process.version,
      inputDigests: inputDigests(),
      distFiles: distFiles(),
    };
    const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, bytes);
    appendFileSync(
      output,
      `producer-run-attempt=${producerRunAttempt}\nmanifest-sha256=${sha256(bytes)}\n`,
    );
    console.info("Build provenance written");
    return;
  }

  // Compare to the producer output, never to a retrying consumer's GITHUB_RUN_ATTEMPT.
  const expectedAttempt = requiredEnv(
    "EXPECTED_PRODUCER_RUN_ATTEMPT",
    /^[1-9][0-9]*$/,
  );
  const expectedDigest = requiredEnv(
    "EXPECTED_MANIFEST_SHA256",
    /^[0-9a-f]{64}$/,
  );
  if (fileDigest(manifestPath) !== expectedDigest)
    throw new Error("Manifest SHA-256 mismatch");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const [key, expected] of Object.entries({
    sha,
    runId,
    producerRunAttempt: expectedAttempt,
    nodeVersion: process.version,
  })) {
    if (manifest?.[key] !== expected)
      throw new Error(`Provenance ${key} mismatch`);
  }
  assertMap(inputDigests(), manifest.inputDigests, "Input");
  assertMap(distFiles(), manifest.distFiles, "Dist");
  console.info("Build provenance verified");
}

try {
  main();
} catch (error) {
  console.error(
    `Build provenance failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
