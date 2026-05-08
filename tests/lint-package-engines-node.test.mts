// USMR Phase 5.5.16-pt198 — `package.json` engines.node vs `.nvmrc`
// sync gate.
//
// `.nvmrc` declares the canonical Node major version (currently
// `22.12`). The full version-pinning chain post-pt193 + pt198:
//
//   1. `.nvmrc` (informational; nvm/fnm/asdf consume it)
//   2. CI workflows `node-version:` pins (gated by pt193)
//   3. `package.json` engines.node (gated here — npm install
//      enforces this even when contributors don't read `.nvmrc`)
//
// All three MUST agree on the major version. Otherwise:
//   - A contributor running unsupported Node (no `.nvmrc`-aware
//     manager) installs deps without warning, then hits cryptic
//     runtime errors.
//   - CI runs with one major while local dev runs with another
//     — bug-on-my-machine class regressions.
//
// Pre-pt198 `package.json` had NO `engines` field. `.nvmrc` and
// the 10 CI workflows pinned Node 22, but `npm install` accepted
// any Node version silently. pt198 added `engines.node:
// ">=22.0.0"` so npm install enforces the floor.
//
// Same documentation-vs-implementation drift class as pt193
// (CI Node version vs `.nvmrc` — release.yml pinned Node 20),
// pt183 (`verify:design-md-telemetry` claimed CI-wired but
// wasn't until pt183 fixed it). Different surface (npm
// engines vs CI YAML) but same shape: one source of truth
// contradicts another.
//
// pt198 added the engines field and locks the contract here.
// The gate enforces:
//   - `package.json` declares an `engines.node` field.
//   - The lower-bound MAJOR version in the engines.node range
//     matches `.nvmrc`'s major.

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PKG = join(ROOT, "package.json");
const NVMRC = join(ROOT, ".nvmrc");

function readNvmrcMajor(): string {
  const raw = readFileSync(NVMRC, "utf8").trim();
  const m = raw.match(/^v?(\d+)(?:\.\d+)*$/);
  if (!m) throw new Error(`.nvmrc unrecognized format: ${JSON.stringify(raw)}`);
  return m[1]!;
}

function extractEnginesNodeMajor(spec: string): string | null {
  // Match leading `>=`, `>`, `~`, `^`, or no operator. Capture the
  // first major number.
  const m = spec.match(/^[~^>=<!]*\s*v?(\d+)(?:\.\d+)*/);
  return m ? m[1]! : null;
}

describe("package.json engines.node vs .nvmrc (pt198)", () => {
  test("package.json declares engines.node and major matches .nvmrc", () => {
    expect(existsSync(PKG), "package.json must exist").toBe(true);
    expect(existsSync(NVMRC), ".nvmrc must exist").toBe(true);

    const pkg = JSON.parse(readFileSync(PKG, "utf8"));
    const expectedMajor = readNvmrcMajor();
    expect(expectedMajor, ".nvmrc must declare a numeric Node major").toMatch(
      /^\d+$/,
    );

    const enginesNode = pkg?.engines?.node;
    if (!enginesNode || typeof enginesNode !== "string") {
      throw new Error(
        `package.json must declare engines.node — currently absent.\n` +
          `Fix: add an \`engines\` field with \`"node": ">=${expectedMajor}.0.0"\` to lock the install-time Node floor.`,
      );
    }

    const declaredMajor = extractEnginesNodeMajor(enginesNode);
    if (declaredMajor === null) {
      throw new Error(
        `package.json engines.node has unparseable form: ${JSON.stringify(enginesNode)}\n` +
          `Fix: use a standard semver range like ">=${expectedMajor}.0.0".`,
      );
    }

    if (declaredMajor !== expectedMajor) {
      throw new Error(
        `package.json engines.node major (${declaredMajor}) does not match .nvmrc major (${expectedMajor}).\n` +
          `  - package.json: engines.node = ${JSON.stringify(enginesNode)}\n` +
          `  - .nvmrc:       ${readFileSync(NVMRC, "utf8").trim()}\n` +
          `Fix: bump engines.node to ">=${expectedMajor}.0.0" or update .nvmrc to match.`,
      );
    }

    expect(declaredMajor).toBe(expectedMajor);
  });
});
