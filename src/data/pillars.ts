// USMR Phase 5.1c (initial) + 5.2.3 (extension) — Pillar registry.
// Three consumers:
//   1. The home page renders id/eyebrow/title/body as a 3-card overview
//      (`src/pages/index.astro` pillar grid).
//   2. The /platform page renders the FULL shape (tagline, body, bullets,
//      specimen) as an interactive tablist via `<PillarsIsland>`
//      (`src/components/PillarsIsland.tsx`).
//   3. Vitest invariants assert shape + glossary-coverage in
//      `tests/pillars-data.test.mts` (Phase 5.2.3 follow-on).
//
// Bullet structure: each bullet is a sequence of `BulletNode` tokens —
// either plain text or a glossary `term`. The PillarsIsland resolves
// `term` nodes via `lookupGlossary` and renders them as `.standard-chip`
// links, mirroring the Astro `<Standard>` component. The home-page
// 3-card overview ignores `bullets` + `specimen` entirely (those fields
// are scoped to the /platform tablist).

import type { GlossaryTerm } from "./glossary.js";

export type Pillar = {
  /** Stable id used for the rendered card id (#pillar-identity, etc.) and any future cross-route anchor convention. */
  id: "identity" | "credentials" | "authorization";
  /** "01" / "02" / "03" — mono numeric prefix on the tab strip. */
  num: string;
  /**
   * Tab eyebrow taxonomy label — currently the closed canonical set
   * "Identity" / "Credentials" / "Authorization". Rendered uppercased
   * via `pillar.eyebrow.toUpperCase()` in PillarsIsland (5.2.4).
   */
  eyebrow: string;
  /** Bold tab title — canonical brand name, e.g. "High-Assurance Identity". */
  title: string;
  /** Serif italic line under the active tab. */
  tagline: string;
  /**
   * Long-form body — sequence of text + glossary `term` nodes mirroring
   * the bullet shape. Renders inline glossary chips on /platform per
   * canonical Pillars.jsx:14-21,38-44,61-66 (USMR Phase 5.5.11 Task #29
   * widened from `body: string`). The home-page 3-card overview
   * flattens the nodes via `body.map(n => n.value).join("")`; the
   * /platform tablist consumes the structured nodes via the same
   * `<Tokenized>` / `<BulletLine>` renderer used for bullets.
   */
  body: Body;
  /** Bullet list rendered under the panel paragraph on /platform. */
  bullets: readonly Bullet[];
  /** Live-looking JSON / policy code panel paired with the tab. */
  specimen: Specimen;
};

/** A single bullet — sequence of text segments and glossary chips. */
export type Bullet = readonly BulletNode[];

export type BulletNode =
  | { kind: "text"; value: string }
  | { kind: "term"; value: string };

/**
 * A body paragraph — same shape as a Bullet; sequence of text segments
 * and glossary chips. Aliased so the renderer + tests can share the
 * single helper utilities (`flattenBody` / `<Tokenized>`).
 */
export type Body = readonly BulletNode[];

export type Specimen = {
  /** Visual hint — affects header label rendering only today. */
  kind: "jwt" | "vc" | "policy";
  /**
   * Header line rendered above the specimen body — free-form, shape
   * varies by `kind`. Canonical examples:
   *   jwt    → JSON literal, e.g. `'{"alg":"ES256","typ":"dpop+jwt","jwk":{…}}'`
   *   vc     → descriptive label, e.g. `'Presented VC (SD-JWT) — selective disclosure'`
   *   policy → mono filename, e.g. `'cedar — permit.cedar'`
   * The renderer applies `text-transform: uppercase` via `.pillar-specimen__head`,
   * so authored values stay in their natural case.
   */
  header: string;
  /**
   * Code body. Multiline string with `\n` separators rendered into a
   * `<pre>` with `white-space: pre-wrap`. Per resolved Open question
   * 4, identity-team review of these strings happens before a route
   * ships (tracked via `lint:specimens` — task 5.2.y).
   */
  payload: string;
};

/** Convenience helper for inline bullet construction. */
const t = (value: GlossaryTerm | string): BulletNode => ({
  kind: "term",
  value,
});
const txt = (value: string): BulletNode => ({ kind: "text", value });

export const PILLARS: readonly Pillar[] = [
  {
    id: "identity",
    num: "01",
    eyebrow: "Identity",
    title: "High-Assurance Identity",
    tagline: "Passkey-primary. Phishing-resistant by default.",
    body: [
      txt("Unified "),
      t("OIDC 2.1"),
      txt(" & "),
      t("GNAP"),
      txt(" provider. Hardened profiles — "),
      t("PAR"),
      txt(", "),
      t("JAR"),
      txt(", "),
      t("DPoP"),
      txt(", "),
      t("RAR"),
      txt(", "),
      t("mTLS"),
      txt(
        " — composed into one developer-friendly surface. Hardware device attestation (Apple App Attest, Android Play Integrity, ",
      ),
      t("WebAuthn"),
      txt(") is invisible to users and enforced at every request."),
    ],
    bullets: [
      [
        t("OIDC 2.1"),
        txt(" conformance + "),
        t("GNAP"),
        txt(" ("),
        t("RFC"),
        txt(" 9635)"),
      ],
      [
        t("DPoP"),
        txt(", "),
        t("PAR"),
        txt(", "),
        t("JAR"),
        txt(", "),
        t("RAR"),
        txt(", "),
        t("mTLS"),
        txt(" — hardened profiles"),
      ],
      [
        txt("Cryptographic multi-tenancy ("),
        t("KMS"),
        txt(" / "),
        t("HSM"),
        txt(")"),
      ],
      [txt("Device & app attestation for machines")],
    ],
    specimen: {
      kind: "jwt",
      header: '{"alg":"ES256","typ":"dpop+jwt","jwk":{…}}',
      payload:
        '{\n  "sub": "u_a3f…02c",\n  "cnf": { "jkt": "NzbLsXh8…" },\n  "amr": ["hwk","swk","user"],\n  "acr": "urn:artagon:loa:3"\n}',
    },
  },
  {
    id: "credentials",
    num: "02",
    eyebrow: "Credentials",
    title: "Decentralized Trust Layer",
    tagline: "Verifiable credentials. Selective, unlinkable, portable.",
    body: [
      txt("Issue and verify verifiable credentials in "),
      t("SD-JWT"),
      txt(" (selective disclosure) and "),
      t("BBS+"),
      txt(" (unlinkable zero-knowledge) formats. "),
      t("OID4VCI"),
      txt(" / "),
      t("OID4VP"),
      txt(" flows bridge legacy "),
      t("OIDC"),
      txt(
        " apps to verifiable data without refactors — the Trojan Horse for enterprise adoption.",
      ),
    ],
    bullets: [
      [t("DID"), txt(" methods: did:web, did:key, did:ion, did:peer")],
      [t("SD-JWT"), txt(" + "), t("BBS+"), txt(" signatures")],
      [t("OID4VCI"), txt(" issuance, "), t("OID4VP"), txt(" verification")],
      [t("StatusList2021"), txt(" revocation (no phone-home)")],
    ],
    specimen: {
      kind: "vc",
      header: "Presented VC (SD-JWT) — selective disclosure",
      payload:
        '{\n  "iss": "did:web:artagon.com",\n  "sub": "did:peer:2.Ez…",\n  "vct": "ProofingVC/IAL2",\n  "disclosed": ["age_over_18","country"],\n  "withheld": ["dob","ssn","name"]\n}',
    },
  },
  {
    id: "authorization",
    num: "03",
    eyebrow: "Authorization",
    title: "Graph-Native Authorization",
    tagline: "Zanzibar relationships + Cedar/OPA policies. Under 10ms.",
    body: [
      txt("Fast-path "),
      t("ReBAC"),
      txt(" via a globally replicated "),
      t("Zanzibar"),
      txt(" graph for millisecond relationship checks. Fine-grained "),
      t("ABAC"),
      txt(" overlay in "),
      t("Cedar"),
      txt(", "),
      t("OPA"),
      txt(" ("),
      t("Rego"),
      txt("), or "),
      t("XACML"),
      txt(" 3.0+ for contextual policy. Git-backed policy-as-code, "),
      t("PEP"),
      txt(" "),
      t("SDKs"),
      txt(" in 5 languages."),
    ],
    bullets: [
      [t("Zanzibar"), txt(" graph store (off-heap, replicated)")],
      [
        txt("Polyglot "),
        t("PDP"),
        txt(": "),
        t("Cedar"),
        txt(", "),
        t("OPA"),
        txt(", "),
        t("XACML"),
      ],
      [t("PEP"), txt(" "), t("SDKs"), txt(" — Java, Rust, TS, Go, Swift")],
      [txt("Decision caching, obligations, audit/explain")],
    ],
    specimen: {
      // Canonical Cedar specimen — new-design Pillars.jsx:76-77. Demos
      // the *graph*-native authorization narrative the pillar is named
      // for: principal-in-Group composition, Account type binding, and
      // a `context.delegation.vc` predicate that ties Authorization
      // back to the verifiable-credentials pillar above. The earlier
      // generic `principal/action/resource` payload removed every
      // teaching primitive that made the Authorization pillar visually
      // distinct from a stock RBAC example.
      kind: "policy",
      header: "cedar — permit.cedar",
      payload:
        'permit (\n  principal in Group::"csr_team",\n  action == Action::"view_account",\n  resource is Account\n) when {\n  context.delegation.vc.valid &&\n  context.delegation.expires > now()\n};',
    },
  },
] as const;
