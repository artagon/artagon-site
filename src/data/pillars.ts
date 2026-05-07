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
  /** Top-line eyebrow, e.g. "Unified OP / AS". */
  eyebrow: string;
  /** Bold tab title, e.g. "OIDC 2.1 + GNAP". */
  title: string;
  /** Serif italic line under the active tab. */
  tagline: string;
  /** Long-form body, used as the home-page card description AND the /platform panel paragraph. Plain text — no inline tokens. */
  body: string;
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

export type Specimen = {
  /** Visual hint — affects header label rendering only today. */
  kind: "jwt" | "vc" | "policy";
  /** Mono-uppercase header line (e.g. "DPOP KEY", "PRESENTED VC"). */
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
    eyebrow: "Unified OP / AS",
    title: "OIDC 2.1 + GNAP",
    tagline: "Passkey-primary. Phishing-resistant by default.",
    body: "Hardened OAuth profiles (PAR, JAR, JARM, RAR, DPoP, mTLS) composed into one developer-friendly surface. GNAP proof-of-possession + continuation, client-key rotation, cryptographic multi-tenancy. Hardware device attestation (Apple App Attest, Android Play Integrity, WebAuthn) is invisible to users and enforced at every request.",
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
      header: "DPOP KEY",
      payload:
        '{"alg":"ES256","typ":"dpop+jwt","jwk":{…}}\n\n{\n  "sub": "u_a3f…02c",\n  "cnf": { "jkt": "NzbLsXh8…" },\n  "amr": ["hwk","swk","user"],\n  "acr": "urn:artagon:loa:3"\n}',
    },
  },
  {
    id: "credentials",
    num: "02",
    eyebrow: "Verifiable Identity",
    title: "Selective disclosure",
    tagline: "Verifiable credentials. Selective, unlinkable, portable.",
    body: "Issue and verify verifiable credentials in SD-JWT (selective disclosure) and BBS+ (unlinkable zero-knowledge) formats. OID4VCI / OID4VP flows bridge legacy OIDC apps to verifiable data without refactors — the Trojan Horse for enterprise adoption.",
    bullets: [
      [t("DID"), txt(" methods: did:web, did:key, did:ion, did:peer")],
      [t("SD-JWT"), txt(" + "), t("BBS+"), txt(" signatures")],
      [t("OID4VCI"), txt(" issuance, "), t("OID4VP"), txt(" verification")],
      [t("StatusList2021"), txt(" revocation (no phone-home)")],
    ],
    specimen: {
      kind: "vc",
      header: "PRESENTED VC (SD-JWT)",
      payload:
        '{\n  "iss": "did:web:artagon.com",\n  "sub": "did:peer:2.Ez…",\n  "vct": "ProofingVC/IAL2",\n  "disclosed": ["age_over_18","country"],\n  "withheld": ["dob","ssn","name"]\n}',
    },
  },
  {
    id: "authorization",
    num: "03",
    eyebrow: "Policy & Graph",
    title: "Zanzibar-style checks",
    tagline: "Zanzibar relationships + Cedar / OPA policies. Under 10 ms.",
    body: "Fast-path ReBAC via a globally replicated Zanzibar graph for millisecond relationship checks. Fine-grained ABAC overlay in Cedar, OPA (Rego), or XACML 3.0+ for contextual policy. Git-backed policy-as-code, PEP SDKs in 5 languages.",
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
      // Resolved Open question 4 — generic Cedar starter using only
      // documented primitives. NO Artagon-internal type names. Marked
      // for identity-team review per the lint:specimens contract
      // (task 5.2.y).
      kind: "policy",
      header: "CEDAR — permit.cedar",
      // @TODO-IDENTITY-REVIEW: <reviewer> by 2026-05-21
      payload:
        'permit (\n  principal,\n  action == Action::"read",\n  resource\n) when {\n  principal in resource.allowed_groups &&\n  context.mfa_verified\n};',
    },
  },
] as const;
