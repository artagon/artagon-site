import { describe, expect, test } from "vitest";
import { ORG, type OrgContact } from "../src/data/organization.ts";

describe("organization data registry", () => {
  test("contacts is non-empty", () => {
    expect(ORG.contacts.length).toBeGreaterThan(0);
  });

  test("every contact has a non-empty label and value", () => {
    for (const c of ORG.contacts) {
      expect(c.label, "label").not.toBe("");
      expect(c.label.trim(), "label whitespace-only").not.toBe("");
      expect(c.value, "value").not.toBe("");
      expect(c.value.trim(), "value whitespace-only").not.toBe("");
    }
  });

  test("contact labels are unique", () => {
    const labels = ORG.contacts.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("at least one contact has a Security audience", () => {
    // Convention: a Security contact is required so disclosure routing
    // (security.txt, /security route, JSON-LD) can resolve a target.
    const security = ORG.contacts.find(
      (c: OrgContact) => c.label === "Security",
    );
    expect(security, "Security contact").toBeDefined();
    expect(security?.value).toMatch(/security@/);
  });

  test("at least one contact has a Location audience", () => {
    // Convention: a Location row is required so the footer + structured
    // data can resolve a postal/region anchor without string-matching prose.
    const location = ORG.contacts.find(
      (c: OrgContact) => c.label === "Location",
    );
    expect(location, "Location contact").toBeDefined();
  });

  test("contactFootnote, if present, is non-empty", () => {
    if (ORG.contactFootnote !== undefined) {
      expect(ORG.contactFootnote.trim()).not.toBe("");
    }
  });
});
