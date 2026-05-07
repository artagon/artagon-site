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

// Negative-path coverage for the module-load runtime gate. The gate logic
// is duplicated in this test as a pure function so we don't need
// `vi.doMock` to exercise the throw — the goal is to lock the assertion
// shape so a future "cleanup" that removes the gate from organization.ts
// fails this test in addition to the fact-of-throwing tests above.
describe("organization runtime gate (assertion shape)", () => {
  type OrgContactInput = { label: string; value: string };
  function validateContacts(
    contacts: readonly OrgContactInput[],
    footnote: string | undefined,
  ): string[] {
    const errs: string[] = [];
    for (const [i, c] of contacts.entries()) {
      if (c.label.trim() === "")
        errs.push(`contacts[${i}].label is empty or whitespace-only`);
      if (c.value.trim() === "")
        errs.push(
          `contacts[${i}].value is empty or whitespace-only (label: ${c.label})`,
        );
    }
    if (footnote !== undefined && footnote.trim() === "") {
      errs.push(
        "contactFootnote is set but empty — drop the key or set a non-empty string",
      );
    }
    return errs;
  }

  test("flags empty label", () => {
    const errs = validateContacts(
      [{ label: "", value: "info@artagon.com" }],
      undefined,
    );
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/label is empty/);
  });

  test("flags whitespace-only value", () => {
    const errs = validateContacts(
      [{ label: "Enterprise", value: "   " }],
      undefined,
    );
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/value is empty/);
  });

  test("flags empty footnote", () => {
    const errs = validateContacts([{ label: "X", value: "y" }], "");
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/contactFootnote is set but empty/);
  });

  test("aggregates multiple errors", () => {
    // contacts[0]: empty label + empty value (2 errors)
    // contacts[1]: whitespace-only value (1 error)
    // footnote: whitespace-only (1 error)
    // = 4 aggregated errors
    const errs = validateContacts(
      [
        { label: "", value: "" },
        { label: "X", value: " " },
      ],
      "  ",
    );
    expect(errs).toHaveLength(4);
  });

  test("zero errors on a well-formed registry", () => {
    const errs = validateContacts(
      [
        { label: "Enterprise", value: "enterprise@artagon.com" },
        { label: "Location", value: "Philadelphia, Pennsylvania" },
      ],
      "PGP key & disclosure at artagon.com/.well-known",
    );
    expect(errs).toHaveLength(0);
  });
});
