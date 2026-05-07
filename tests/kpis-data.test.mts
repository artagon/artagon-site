import { describe, expect, test } from "vitest";
import { KPIS, type KPI } from "../src/data/kpis.ts";

// USMR Phase 5.1q.12 — closes the round-5 review's orphan finding:
// `src/data/kpis.ts` was preserved through the 5.1n KPI band prune for
// Phase 5.2 (`/platform` redesign) reuse, but had no consumer AND no
// test. This suite is the typed-data invariant that pins the contract
// until 5.2 wires the consumer.

describe("KPIs data registry", () => {
  test("KPIS is non-empty", () => {
    expect(KPIS.length).toBeGreaterThan(0);
  });

  test("KPIS has at least 4 entries (legacy band shipped 4)", () => {
    expect(KPIS.length).toBeGreaterThanOrEqual(4);
  });

  test("KPIS eyebrow labels are unique", () => {
    const labels = KPIS.map((k) => k.eyebrow);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("every KPI has a non-empty eyebrow / value / detail", () => {
    for (const k of KPIS) {
      expect(k.eyebrow.trim(), `eyebrow of ${k.eyebrow}`).not.toBe("");
      expect(k.value.trim(), `value of ${k.eyebrow}`).not.toBe("");
      expect(k.detail.trim(), `detail of ${k.eyebrow}`).not.toBe("");
    }
  });

  test("KPI value strings carry a numeric component (target / percentile)", () => {
    // Each KPI is a quantitative claim — the value string must include
    // at least one digit (e.g. "< 10 ms p95", "99.95%"). A KPI without a
    // number is decorative copy and belongs elsewhere.
    for (const k of KPIS) {
      expect(k.value, k.eyebrow).toMatch(/\d/);
    }
  });

  test("KPI type structurally accepts an arbitrary entry", () => {
    const example: KPI = {
      eyebrow: "Test",
      value: "1 ms",
      detail: "Synthetic",
    };
    expect(example.eyebrow).toBe("Test");
  });
});
