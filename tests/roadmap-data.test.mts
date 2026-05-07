import { describe, expect, test } from "vitest";
import {
  ROADMAP_PHASES,
  ROADMAP_STATUS,
  type RoadmapStatus,
} from "../src/data/roadmap.ts";

// USMR Phase 5.7 — /roadmap data registry invariants. The
// RoadmapTimeline component depends on the 5-phase shape being
// well-formed; an unknown status key would render the dot fill as
// fallback `var(--fg-3)` (planned) silently. These invariants pin
// the contract.

describe("roadmap — phases", () => {
  test("exactly 5 phases V1-V5 in canonical order", () => {
    expect(ROADMAP_PHASES.length).toBe(5);
    expect(ROADMAP_PHASES.map((p) => p.version)).toEqual([
      "V1",
      "V2",
      "V3",
      "V4",
      "V5",
    ]);
  });

  test("every phase has a non-empty title + when band", () => {
    for (const p of ROADMAP_PHASES) {
      expect(p.title.trim(), `${p.version}.title`).not.toBe("");
      expect(p.when.trim(), `${p.version}.when`).not.toBe("");
    }
  });

  test("every phase has at least 3 items", () => {
    for (const p of ROADMAP_PHASES) {
      expect(
        p.items.length,
        `${p.version}.items.length`,
      ).toBeGreaterThanOrEqual(3);
      for (const item of p.items) {
        expect(item.trim(), `${p.version} item "${item}"`).not.toBe("");
      }
    }
  });

  test("every phase status resolves in ROADMAP_STATUS", () => {
    const validStatuses = Object.keys(ROADMAP_STATUS) as RoadmapStatus[];
    for (const p of ROADMAP_PHASES) {
      expect(
        validStatuses,
        `${p.version} status="${p.status}" not a known status`,
      ).toContain(p.status);
    }
  });

  test("status progression is monotonic — earlier phases ahead", () => {
    // Sanity: V1 should be furthest along, V5 should be the most
    // speculative. Encoded as an ordering: shipping (4) > in-build
    // (3) > design (2) > planned (1).
    const rank: Record<RoadmapStatus, number> = {
      shipping: 4,
      "in-build": 3,
      design: 2,
      planned: 1,
    };
    for (let i = 0; i < ROADMAP_PHASES.length - 1; i++) {
      const cur = rank[ROADMAP_PHASES[i]!.status];
      const next = rank[ROADMAP_PHASES[i + 1]!.status];
      expect(
        cur,
        `${ROADMAP_PHASES[i]!.version} (${ROADMAP_PHASES[i]!.status}) should be >= ${ROADMAP_PHASES[i + 1]!.version} (${ROADMAP_PHASES[i + 1]!.status})`,
      ).toBeGreaterThanOrEqual(next);
    }
  });
});

describe("roadmap — status meta", () => {
  test("every status has a colorToken matching a CSS custom property prefix", () => {
    for (const [key, meta] of Object.entries(ROADMAP_STATUS)) {
      expect(meta.colorToken, `${key}.colorToken`).toMatch(/^--/);
      expect(meta.label.trim(), `${key}.label`).not.toBe("");
    }
  });

  test("status keys are exactly the 4 canonical states", () => {
    const keys = Object.keys(ROADMAP_STATUS).sort();
    expect(keys).toEqual(["design", "in-build", "planned", "shipping"]);
  });
});
