import { describe, expect, test } from "vitest";
import { STAGES, SCENARIOS } from "../src/data/trust-chain.ts";

describe("trust-chain data registry", () => {
  test("STAGES has 5 entries", () => {
    expect(STAGES).toHaveLength(5);
  });

  test("STAGES ids are unique", () => {
    const ids = STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("STAGES ids are stable across UI surfaces", () => {
    // The home hero and /platform deep-dive both reference these by id; if
    // any rename here, both sides break. Lock the set explicitly.
    expect(STAGES.map((s) => s.id)).toEqual([
      "passkey",
      "device",
      "dpop",
      "vc",
      "policy",
    ]);
  });

  test("SCENARIOS has 6 entries", () => {
    expect(SCENARIOS).toHaveLength(6);
  });

  test("SCENARIOS ids are unique", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every scenario.stages has STAGES.length entries", () => {
    for (const s of SCENARIOS) {
      expect(s.stages, `scenario ${s.id}`).toHaveLength(STAGES.length);
    }
  });

  test("every scenario.stages outcome is one of pass/fail/skip", () => {
    const valid = ["pass", "fail", "skip"] as const;
    for (const s of SCENARIOS) {
      for (const o of s.stages) {
        expect(valid, `scenario ${s.id}`).toContain(o);
      }
    }
  });

  test("PERMIT scenarios have all-pass stages", () => {
    for (const s of SCENARIOS) {
      if (s.decision === "PERMIT") {
        expect(
          s.stages.every((o) => o === "pass"),
          `scenario ${s.id}`,
        ).toBe(true);
      }
    }
  });

  test("DENY scenarios have exactly one fail with skips after", () => {
    for (const s of SCENARIOS) {
      if (s.decision !== "DENY") continue;
      const failIdx = s.stages.indexOf("fail");
      expect(failIdx, `scenario ${s.id}`).not.toBe(-1);
      expect(
        s.stages.filter((o) => o === "fail"),
        `scenario ${s.id}`,
      ).toHaveLength(1);
      for (let i = 0; i < failIdx; i++) {
        expect(s.stages[i], `scenario ${s.id} stage ${i}`).toBe("pass");
      }
      for (let i = failIdx + 1; i < s.stages.length; i++) {
        expect(s.stages[i], `scenario ${s.id} stage ${i}`).toBe("skip");
      }
    }
  });

  test("PERMIT finalClaim starts with decision=PERMIT", () => {
    for (const s of SCENARIOS) {
      if (s.decision === "PERMIT") {
        expect(s.finalClaim, `scenario ${s.id}`).toMatch(/^decision=PERMIT/);
      }
    }
  });

  test("DENY finalClaim starts with decision=DENY", () => {
    for (const s of SCENARIOS) {
      if (s.decision === "DENY") {
        expect(s.finalClaim, `scenario ${s.id}`).toMatch(/^decision=DENY/);
      }
    }
  });
});
