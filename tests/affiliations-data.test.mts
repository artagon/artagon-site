import { describe, expect, test } from "vitest";
import {
  AFFILIATIONS,
  HERO_SPECS,
  type Affiliation,
  type HeroSpecLink,
} from "../src/data/affiliations.ts";

describe("affiliations data registry", () => {
  test("AFFILIATIONS is non-empty", () => {
    expect(AFFILIATIONS.length).toBeGreaterThan(0);
  });

  test("AFFILIATIONS labels are unique", () => {
    const labels = AFFILIATIONS.map((a) => a.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("AFFILIATIONS href is a non-empty external https URL", () => {
    for (const a of AFFILIATIONS) {
      expect(a.href, a.label).toMatch(/^https:\/\//);
    }
  });

  test("AFFILIATIONS label, href, title are all non-empty", () => {
    for (const a of AFFILIATIONS) {
      expect(a.label.trim()).not.toBe("");
      expect(a.href.trim()).not.toBe("");
      expect(a.title.trim()).not.toBe("");
    }
  });

  test("HERO_SPECS is non-empty", () => {
    expect(HERO_SPECS.length).toBeGreaterThan(0);
  });

  test("HERO_SPECS labels are unique", () => {
    const labels = HERO_SPECS.map((s: HeroSpecLink) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("HERO_SPECS contains the trust-chain canonical 5 (OIDC/GNAP/OID4VC/Zanzibar/Cedar)", () => {
    const labels = HERO_SPECS.map((s) => s.label);
    expect(labels).toContain("OIDC");
    expect(labels).toContain("GNAP");
    expect(labels).toContain("OID4VC");
    expect(labels).toContain("Zanzibar");
    expect(labels).toContain("Cedar");
  });

  test("HERO_SPECS href is a non-empty external https URL", () => {
    for (const s of HERO_SPECS) {
      expect(s.href, s.label).toMatch(/^https:\/\//);
    }
  });

  test("Affiliation type structurally accepts an arbitrary entry", () => {
    const example: Affiliation = {
      label: "Test",
      href: "https://example.com/",
      title: "Test citation",
    };
    expect(example.label).toBe("Test");
  });
});
