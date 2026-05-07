import { describe, expect, test } from "vitest";
import { USE_CASES, type UseCaseId } from "../src/data/use-cases.ts";

// USMR Phase 5.3 — /use-cases data registry invariants. The
// UseCasesIsland component depends on the 4-scenario shape being
// well-formed; an empty trace[] would render an empty <ol>, and a
// missing metrics[2] entry would crash the divider strip layout.

describe("USE_CASES tuple shape", () => {
  test("contains exactly 4 scenarios in canonical order", () => {
    expect(USE_CASES).toHaveLength(4);
    const ids = USE_CASES.map((c) => c.id);
    expect(ids).toEqual([
      "csr",
      "specialist",
      "valet",
      "ai",
    ] satisfies UseCaseId[]);
  });

  test("every scenario has a unique id", () => {
    const ids = USE_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every scenario has a unique label", () => {
    const labels = USE_CASES.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("scenario content invariants", () => {
  for (const scenario of USE_CASES) {
    describe(scenario.id, () => {
      test("label, short, title, scenario are non-empty strings", () => {
        expect(scenario.label.trim()).not.toBe("");
        expect(scenario.short.trim()).not.toBe("");
        expect(scenario.title.trim()).not.toBe("");
        expect(scenario.scenario.trim()).not.toBe("");
      });

      test("scenario body is a real sentence (>= 60 chars)", () => {
        // Catches accidental truncation. Shortest canonical body is
        // ~150 chars; 60 is a generous floor.
        expect(scenario.scenario.length).toBeGreaterThanOrEqual(60);
      });

      test("trace has at least 3 lines (covers narrative arc)", () => {
        // Setup → action → decision is the minimum to convey a flow.
        expect(scenario.trace.length).toBeGreaterThanOrEqual(3);
        for (const line of scenario.trace) {
          expect(line.trim()).not.toBe("");
        }
      });

      test("trace's last line is the decision (PERMIT or DENIED)", () => {
        // The renderer paints the last line in --accent. If the
        // decision migrated mid-trace this gate fires before it ships.
        const last = scenario.trace[scenario.trace.length - 1];
        expect(last).toMatch(/PERMIT|DENIED/);
      });

      test("metrics has exactly 3 entries (divider-strip contract)", () => {
        expect(scenario.metrics).toHaveLength(3);
        for (const metric of scenario.metrics) {
          expect(metric.key.trim()).not.toBe("");
          expect(metric.value.trim()).not.toBe("");
        }
      });
    });
  }
});

describe("scenario taxonomy coverage", () => {
  test("includes both human and AI scenarios", () => {
    // The /use-cases narrative spans Human→Human, Human→Machine, and
    // Human→Autonomous-Machine. A regression that drops the AI agent
    // scenario would silently change the page's meaning.
    const shorts = USE_CASES.map((c) => c.short.toLowerCase());
    expect(shorts.some((s) => s.includes("human → human"))).toBe(true);
    expect(shorts.some((s) => s.includes("human → machine"))).toBe(true);
    expect(shorts.some((s) => s.includes("autonomous"))).toBe(true);
  });
});
