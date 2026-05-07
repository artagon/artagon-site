import { describe, expect, test } from "vitest";
import { PARTIES, STEPS, type LabelNode } from "../src/data/bridge.ts";
import { lookupGlossary } from "../src/data/glossary.ts";

// USMR Phase 5.2.8 — /bridge data registry invariants. The
// BridgeFlow React island depends on the 3-party / 4-step shape
// being well-formed; an entry pointing at a non-existent nodeId or
// using a glossary term that doesn't resolve would render a broken
// chip. These invariants pin the contract.

describe("bridge — parties registry", () => {
  test("exactly 3 parties — RP / Trust service / Holder", () => {
    expect(PARTIES.length).toBe(3);
    const roles = PARTIES.map((p) => p.role);
    expect(roles).toEqual(["Relying party", "Trust service", "Holder"]);
  });

  test("party ids are stable + unique", () => {
    const ids = PARTIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["app", "artagon", "wallet"]);
  });

  test("every label / sub `term` node resolves in the glossary", () => {
    for (const p of PARTIES) {
      assertTermsResolve(p.label, `parties[${p.id}].label`);
      assertTermsResolve(p.sub, `parties[${p.id}].sub`);
    }
  });

  test("every party has a non-empty label", () => {
    for (const p of PARTIES) {
      const flat = flatten(p.label);
      expect(flat.trim(), `parties[${p.id}].label`).not.toBe("");
    }
  });
});

describe("bridge — steps registry", () => {
  test("exactly 4 steps numbered 1-4", () => {
    expect(STEPS.length).toBe(4);
    expect(STEPS.map((s) => s.num)).toEqual(["1", "2", "3", "4"]);
  });

  test("each step's nodeId points at a real party", () => {
    const validIds = new Set(PARTIES.map((p) => p.id));
    for (const s of STEPS) {
      expect(
        validIds.has(s.nodeId),
        `step ${s.num} nodeId="${s.nodeId}" not a known party`,
      ).toBe(true);
    }
  });

  test("every step has a non-empty title", () => {
    for (const s of STEPS) {
      expect(s.title.trim(), `step ${s.num}.title`).not.toBe("");
    }
  });

  test("every desc `term` node resolves in the glossary", () => {
    for (const s of STEPS) {
      assertTermsResolve(s.desc, `steps[${s.num}].desc`);
    }
  });

  test("step titles are unique (no copy-paste bugs)", () => {
    const titles = STEPS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("bridge — node activation coverage", () => {
  test("every party is activated by at least one step", () => {
    const activated = new Set(STEPS.map((s) => s.nodeId));
    for (const p of PARTIES) {
      expect(
        activated.has(p.id),
        `party ${p.id} is never activated by any step`,
      ).toBe(true);
    }
  });
});

// ------------------------------------------------------------------
function flatten(nodes: readonly LabelNode[]): string {
  return nodes.map((n) => n.value).join("");
}

function assertTermsResolve(nodes: readonly LabelNode[], where: string) {
  for (const n of nodes) {
    if (n.kind === "term") {
      expect(
        lookupGlossary(n.value),
        `${where}: glossary miss for term="${n.value}"`,
      ).toBeDefined();
    }
  }
}
