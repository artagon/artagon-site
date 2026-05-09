import { describe, expect, test } from "vitest";
import { GLOSSARY, lookupGlossary } from "../src/data/glossary.ts";

// USMR Phase 5.2.2 — glossary registry invariants. The Standard chip
// component (src/components/Standard.astro) depends on this map being
// well-formed; an entry with an empty `name` or a relative `href`
// would render a broken tooltip / break the external-link contract
// silently. The build-time console.warn in Standard.astro catches
// MISSING entries; this test catches MALFORMED ones.

describe("glossary registry", () => {
  const entries = Object.entries(GLOSSARY);

  test("registry is non-empty (>= 50 entries)", () => {
    // The new-design canonical ships ~60 entries; new acronyms get
    // appended as routes grow. Floor of 50 catches a regression that
    // accidentally truncates the map.
    expect(entries.length).toBeGreaterThanOrEqual(50);
  });

  test("every entry has a non-empty name", () => {
    for (const [term, def] of entries) {
      expect(def.name.trim(), `${term}.name`).not.toBe("");
    }
  });

  test("every href is an absolute https URL", () => {
    for (const [term, def] of entries) {
      expect(def.href, `${term}.href`).toMatch(/^https:\/\//);
    }
  });

  test("every entry's `external` flag is a boolean", () => {
    for (const [term, def] of entries) {
      expect(typeof def.external, `${term}.external`).toBe("boolean");
    }
  });

  test("every external entry will open in a new tab — site-wide convention", () => {
    // Today every entry is external. The `external` flag exists for
    // future flexibility; if a future internal entry sets it false,
    // remove this test or scope it.
    for (const [term, def] of entries) {
      expect(def.external, `${term}.external should be true today`).toBe(true);
    }
  });

  test("must include the Pillars.jsx canonical vocabulary", () => {
    // Resolved Open question 3 — the 25-acronym floor for /platform.
    const required = [
      "OIDC 2.1",
      "GNAP",
      "PAR",
      "JAR",
      "DPoP",
      "RAR",
      "mTLS",
      "WebAuthn",
      "KMS",
      "HSM",
      "SD-JWT",
      "BBS+",
      "OID4VCI",
      "OID4VP",
      "DID",
      "StatusList2021",
      "ReBAC",
      "Zanzibar",
      "ABAC",
      "Cedar",
      "OPA",
      "Rego",
      "XACML",
      "PEP",
      "PDP",
      "RFC",
    ];
    for (const term of required) {
      expect(
        lookupGlossary(term),
        `Pillars.jsx requires "${term}"; missing from glossary`,
      ).toBeDefined();
    }
  });

  test("plural aliases (DID/DIDs, PEP/PEPs, etc.) point at the same canonical URL", () => {
    // Standard chip lookup is case-sensitive; pluralized variants live
    // as separate keys but should resolve to the same canonical
    // reference (otherwise different chips for the same concept land
    // on different docs). This test pins the convention.
    const aliases = [
      ["DID", "DIDs"],
      ["VC", "VCs"],
      ["PEP", "PEPs"],
      ["API", "APIs"],
      ["SDK", "SDKs"],
    ] as const;
    for (const [a, b] of aliases) {
      const da = lookupGlossary(a);
      const db = lookupGlossary(b);
      expect(da, `${a} missing`).toBeDefined();
      expect(db, `${b} missing`).toBeDefined();
      expect(da!.href, `${a}/${b} href mismatch`).toBe(db!.href);
    }
  });

  test("lookupGlossary returns undefined for unknown terms (no throw)", () => {
    expect(lookupGlossary("NOT_A_REAL_TERM")).toBeUndefined();
    expect(lookupGlossary("")).toBeUndefined();
  });

  test("no duplicate names across distinct keys (alias check)", () => {
    // Two DIFFERENT keys with the SAME `name` indicates a copy-paste
    // bug where one key is supposed to be a distinct concept. The
    // intentional aliases (DIDs / VCs / etc.) intentionally share
    // `name` with a "s" suffix, so this test asserts the SAME-name
    // count is bounded.
    const names = entries.map(([, def]) => def.name);
    const seen = new Map<string, number>();
    for (const name of names) {
      seen.set(name, (seen.get(name) ?? 0) + 1);
    }
    const collisions = [...seen.entries()].filter(([, n]) => n > 1);
    // Allow collisions only when the canonical-URL is the same (true
    // alias). Reject collisions where the URL differs.
    for (const [name, count] of collisions) {
      const dups = entries.filter(([, def]) => def.name === name);
      const urls = new Set(dups.map(([, def]) => def.href));
      expect(
        urls.size,
        `name "${name}" appears ${count}× across keys with ${urls.size} different URLs`,
      ).toBe(1);
    }
  });
});
