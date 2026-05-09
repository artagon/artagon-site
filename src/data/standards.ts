// USMR Phase 5.4 — /standards data registry. Ports the inline
// STANDARDS data from new-design/extracted/src/components/Standards.jsx
// (the canonical 3-group standards wall + 4-badge affiliation row).
//
// Each item's `name` is looked up in src/data/glossary.ts at render
// time; matches turn into hoverable canonical-URL links automatically
// (no per-item href duplication). The `description` is the short
// catalog-style explainer that sits next to the name in the column.

export interface StandardsItem {
  /** Display name. Looked up against glossary.ts — when a match is found, the name renders as a link to the canonical URL. */
  name: string;
  /** Short catalog-style explainer (one line). */
  description: string;
}

export interface StandardsGroup {
  id: "authn-authz" | "decentralized-id" | "authorization";
  /** Mono-uppercase column header. */
  label: string;
  items: readonly StandardsItem[];
}

export interface StandardsBadge {
  /** Eyebrow (mono-uppercase). */
  kind: "Certifying" | "Contributing" | "Member";
  /** Body label, e.g. "OIDC 2.1" or "IETF · GNAP". */
  value: string;
}

export const STANDARDS_GROUPS: readonly [
  StandardsGroup,
  StandardsGroup,
  StandardsGroup,
] = [
  {
    id: "authn-authz",
    label: "Authn & Authz",
    items: [
      {
        name: "OIDC 2.1",
        description: "OpenID Connect core + discovery + JWKS",
      },
      {
        name: "GNAP",
        description: "RFC 9635 — Grant Negotiation & Authz Protocol",
      },
      { name: "PAR", description: "RFC 9126 — Pushed Authorization Requests" },
      {
        name: "JAR / JARM",
        description: "RFC 9101 — JWT-secured requests & responses",
      },
      {
        name: "DPoP",
        description: "RFC 9449 — Proof-of-possession for tokens",
      },
      { name: "RAR", description: "RFC 9396 — Rich authorization requests" },
      {
        name: "mTLS",
        description: "RFC 8705 — Mutual TLS client authentication",
      },
    ],
  },
  {
    id: "decentralized-id",
    label: "Decentralized ID",
    items: [
      { name: "DIDs", description: "did:web · did:key · did:ion · did:peer" },
      { name: "VCs", description: "Verifiable Credentials — SD-JWT, BBS+" },
      { name: "OID4VCI", description: "OpenID for VC Issuance" },
      { name: "OID4VP", description: "OpenID for VC Presentation" },
      { name: "StatusList2021", description: "Privacy-preserving revocation" },
    ],
  },
  {
    id: "authorization",
    label: "Authorization",
    items: [
      { name: "Zanzibar", description: "Relationship-based access control" },
      { name: "Cedar", description: "Amazon policy language" },
      { name: "OPA / Rego", description: "Open Policy Agent" },
      {
        name: "XACML 3.0+",
        description: "eXtensible Access Control Markup Language",
      },
    ],
  },
] as const;

export const STANDARDS_BADGES: readonly [
  StandardsBadge,
  StandardsBadge,
  StandardsBadge,
  StandardsBadge,
] = [
  { kind: "Certifying", value: "OIDC 2.1" },
  { kind: "Contributing", value: "IETF · GNAP" },
  { kind: "Contributing", value: "OIDF · OID4VC" },
  { kind: "Member", value: "W3C · DID / VC" },
] as const;
