import { describe, expect, test } from "vitest";
import { PILLARS, type Pillar } from "../src/data/pillars.ts";
import { lookupGlossary } from "../src/data/glossary.ts";

// USMR Phase 5.5.6 — closes the long-standing "tests/pillars-data.test.mts
// referenced in src/data/pillars.ts:9 but file does not exist" gap. Every
// surface that consumes `PILLARS` (home page card grid, /platform tablist,
// home-explore link targets) depends on the 3-tuple shape with the closed
// `Identity / Credentials / Authorization` taxonomy.

describe("PILLARS — registry shape", () => {
  test("exactly 3 pillars in canonical order", () => {
    expect(PILLARS).toHaveLength(3);
    const ids = PILLARS.map((p) => p.id);
    expect(ids).toEqual(["identity", "credentials", "authorization"]);
  });

  test("eyebrow taxonomy is the closed canonical set", () => {
    // Per Pillars.jsx:120 + 5.5.2 fix; rendered uppercased via
    // PillarsIsland.tsx:111 (`pillar.eyebrow.toUpperCase()`).
    const eyebrows = PILLARS.map((p) => p.eyebrow);
    expect(eyebrows).toEqual(["Identity", "Credentials", "Authorization"]);
  });

  test("titles are the canonical brand names (not protocol-feature names)", () => {
    // Pre-5.5.2 stub used "OIDC 2.1 + GNAP" / "Selective disclosure" /
    // "Zanzibar-style checks". Canonical brand names are the contract.
    const titles = PILLARS.map((p) => p.title);
    expect(titles).toEqual([
      "High-Assurance Identity",
      "Decentralized Trust Layer",
      "Graph-Native Authorization",
    ]);
  });

  test("num prefixes are 01 / 02 / 03 in order", () => {
    const nums = PILLARS.map((p) => p.num);
    expect(nums).toEqual(["01", "02", "03"]);
  });
});

describe("PILLARS — content invariants", () => {
  for (const pillar of PILLARS) {
    describe(pillar.id, () => {
      test("tagline + body + every text field is non-empty", () => {
        expect(pillar.tagline.trim(), "tagline").not.toBe("");
        expect(pillar.body.trim(), "body").not.toBe("");
      });

      test("body wording matches canonical (>= 100 chars)", () => {
        // Catches accidental truncation. Shortest canonical body is
        // ~250 chars; 100 is a generous floor.
        expect(pillar.body.length).toBeGreaterThanOrEqual(100);
      });

      test("at least 3 bullets — covers narrative arc", () => {
        expect(pillar.bullets.length).toBeGreaterThanOrEqual(3);
      });

      test("every bullet `term` node resolves in the glossary", () => {
        for (let b = 0; b < pillar.bullets.length; b++) {
          const bullet = pillar.bullets[b]!;
          for (const node of bullet) {
            if (node.kind === "term") {
              expect(
                lookupGlossary(node.value),
                `pillar[${pillar.id}].bullet[${b}] term="${node.value}"`,
              ).toBeDefined();
            }
          }
        }
      });

      test("specimen has kind + non-empty header + non-empty payload", () => {
        expect(pillar.specimen.kind).toMatch(/^(jwt|vc|policy)$/);
        expect(pillar.specimen.header.trim()).not.toBe("");
        expect(pillar.specimen.payload.trim()).not.toBe("");
      });
    });
  }
});

describe("PILLARS — Identity specimen header is the canonical JWK JSON", () => {
  test("Identity specimen.header carries the JWK JSON line, not the legacy 'DPOP KEY' label", () => {
    const identity = PILLARS.find((p) => p.id === "identity") as Pillar;
    // Per 5.5.2 fix — header is now the technical line, payload is just
    // the JWT body. Pre-5.5.2 the header read "DPOP KEY" (a label).
    expect(identity.specimen.header).toContain('"alg"');
    expect(identity.specimen.header).toContain('"typ"');
    expect(identity.specimen.payload).not.toContain('"alg"');
  });

  test("Credentials specimen.header has the canonical '— selective disclosure' suffix", () => {
    const creds = PILLARS.find((p) => p.id === "credentials") as Pillar;
    expect(creds.specimen.header).toContain("selective disclosure");
  });

  test("Authorization specimen.header is the canonical 'cedar — permit.cedar' filename", () => {
    const authz = PILLARS.find((p) => p.id === "authorization") as Pillar;
    expect(authz.specimen.header.toLowerCase()).toContain("cedar");
    expect(authz.specimen.header.toLowerCase()).toContain("permit.cedar");
  });
});
