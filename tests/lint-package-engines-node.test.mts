// USMR 14.19/14.50/14.71: gate the minor floor required by plain Node TS imports.
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);

function supportsTypeStripping(version: string): boolean {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false;
  const [major, minor] = version.split(".").map(Number);
  return major! > 22 || (major === 22 && minor! >= 18);
}

function matchesFloor(range: string, floor: string): boolean {
  return supportsTypeStripping(floor) && range === `>=${floor}`;
}

describe("package engines and pinned Node floor", () => {
  test.each(["22.0.0", "22.12.0", "22.17.9"])(
    "rejects an unsupported runtime even when the declarations agree: %s",
    (version) => {
      expect(matchesFloor(`>=${version}`, version)).toBe(false);
    },
  );

  test.each([">=22.0.0", ">=22.12.0", ">=22.18.0 || >=20.0.0", "^22.18.0"])(
    "rejects a mismatched or broadened range %s (negative control)",
    (range) => {
      expect(matchesFloor(range, "22.18.0")).toBe(false);
    },
  );

  test("pins the complete supported minimum in .nvmrc and engines.node", () => {
    const floor = readFileSync(new URL(".nvmrc", root), "utf8").trim();
    const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
    expect(matchesFloor(pkg.engines.node, floor)).toBe(true);
  });
});
