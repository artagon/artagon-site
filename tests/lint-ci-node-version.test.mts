// USMR 14.19/14.50/14.71: CI must honor the full Node type-stripping floor.
import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";

const root = new URL("../", import.meta.url);
const floor = readFileSync(new URL(".nvmrc", root), "utf8").trim();

function compatible(selector: string, minimum: string): boolean {
  if (/^lts\//.test(selector)) return true; // Copilot explicitly tracks LTS.
  if (!/^v?\d+(?:\.\d+){0,2}$/.test(selector)) return false;
  const actual = selector.replace(/^v/, "").split(".").map(Number);
  const expected = minimum.split(".").map(Number);
  if (actual[0] !== expected[0]) return false;
  // A major-only selector resolves the latest patch of that major.
  if (actual.length === 1) return true;
  return (
    actual[1]! > expected[1]! ||
    (actual[1] === expected[1] && (actual[2] ?? 0) >= expected[2]!)
  );
}

describe("CI Node runtime floor", () => {
  test.each(["22.0", "22.12", "22.17.9", "20", "v22.17.9", "unknown"])(
    "rejects unsupported selector %s (negative control)",
    (selector) => {
      expect(compatible(selector, "22.18.0")).toBe(false);
    },
  );

  test.each(["22", "22.18", "22.18.0", "v22.18.1", "lts/*"])(
    "accepts supported selector %s",
    (selector) => {
      expect(compatible(selector, "22.18.0")).toBe(true);
    },
  );

  test("every setup-node pin honors .nvmrc's full floor", () => {
    expect(floor).toMatch(/^\d+\.\d+\.\d+$/);
    const workflows = new URL(".github/workflows/", root);
    let checked = 0;
    for (const file of readdirSync(workflows).filter((f) =>
      /\.ya?ml$/.test(f),
    )) {
      const workflow = parse(readFileSync(new URL(file, workflows), "utf8"));
      for (const job of Object.values(workflow.jobs) as {
        steps?: { uses?: string; with?: Record<string, unknown> }[];
      }[]) {
        for (const step of job.steps ?? []) {
          if (!step.uses?.startsWith("actions/setup-node@")) continue;
          checked++;
          if (step.with?.["node-version-file"] === ".nvmrc") {
            expect(step.with["node-version"], file).toBeUndefined();
          } else {
            expect(
              compatible(String(step.with?.["node-version"]), floor),
              file,
            ).toBe(true);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
