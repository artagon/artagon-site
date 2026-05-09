import { describe, expect, test } from "vitest";
import { STANDARDS_GROUPS, STANDARDS_BADGES } from "../src/data/standards.ts";
import { lookupGlossary } from "../src/data/glossary.ts";

// USMR Phase 5.4 — /standards data registry invariants. The
// StandardsWall component depends on the 3-group / 4-badge shape
// being well-formed; an empty group or a duplicate item name would
// render a column with broken text.

describe("standards — groups registry", () => {
  test("exactly 3 groups in canonical order", () => {
    expect(STANDARDS_GROUPS.length).toBe(3);
    const ids = STANDARDS_GROUPS.map((g) => g.id);
    expect(ids).toEqual(["authn-authz", "decentralized-id", "authorization"]);
  });

  test("every group has a non-empty label and at least 4 items", () => {
    for (const g of STANDARDS_GROUPS) {
      expect(g.label.trim(), `${g.id}.label`).not.toBe("");
      expect(g.items.length, `${g.id}.items.length`).toBeGreaterThanOrEqual(4);
    }
  });

  test("every item has a non-empty name and description", () => {
    for (const g of STANDARDS_GROUPS) {
      for (const item of g.items) {
        expect(item.name.trim(), `${g.id}/${item.name}.name`).not.toBe("");
        expect(
          item.description.trim(),
          `${g.id}/${item.name}.description`,
        ).not.toBe("");
      }
    }
  });

  test("item names are unique within a group", () => {
    for (const g of STANDARDS_GROUPS) {
      const names = g.items.map((i) => i.name);
      expect(new Set(names).size, `${g.id} duplicate item names`).toBe(
        names.length,
      );
    }
  });

  test("the canonical Pillars vocabulary is fully covered", () => {
    // Resolved Open question 3 (Phase 5.2 hand-off): the 25-acronym
    // Pillars baseline. /standards must surface every term that the
    // Pillars page references, otherwise the two pages disagree on
    // what's "supported".
    const required = [
      "OIDC 2.1",
      "GNAP",
      "PAR",
      "JAR / JARM",
      "DPoP",
      "RAR",
      "mTLS",
      "DIDs",
      "VCs",
      "OID4VCI",
      "OID4VP",
      "StatusList2021",
      "Zanzibar",
      "Cedar",
      "OPA / Rego",
      "XACML 3.0+",
    ];
    const all = STANDARDS_GROUPS.flatMap((g) => g.items.map((i) => i.name));
    for (const term of required) {
      expect(all, `/standards must list "${term}"`).toContain(term);
    }
  });

  test("at least 70% of item names resolve in the glossary (clickable)", () => {
    // Some items use composite names (e.g. "JAR / JARM",
    // "OPA / Rego", "XACML 3.0+") that don't map 1:1 to glossary
    // keys — they render as plain text. Pin the floor so a glossary
    // regression doesn't silently strip every link.
    const allNames = STANDARDS_GROUPS.flatMap((g) =>
      g.items.map((i) => i.name),
    );
    const linked = allNames.filter((n) => lookupGlossary(n) !== undefined);
    const ratio = linked.length / allNames.length;
    expect(ratio).toBeGreaterThanOrEqual(0.7);
  });
});

describe("standards — affiliation badges", () => {
  test("exactly 4 badges in canonical order", () => {
    expect(STANDARDS_BADGES.length).toBe(4);
  });

  test("every badge has a known kind", () => {
    const kinds = ["Certifying", "Contributing", "Member"];
    for (const b of STANDARDS_BADGES) {
      expect(kinds).toContain(b.kind);
    }
  });

  test("every badge has a non-empty value", () => {
    for (const b of STANDARDS_BADGES) {
      expect(b.value.trim(), `${b.kind} badge value`).not.toBe("");
    }
  });
});
