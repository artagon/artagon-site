// USMR Phase 5.2.0 — canonical glossary registry. Ported verbatim
// from new-design/extracted/src/pages/index.html:439-510 (the GLOSSARY
// const + the T component's lookup contract). Every term that appears
// inside a `<Standard>` chip on a marketing route MUST resolve here;
// the Standard component logs a build-time warning on misses so a
// gap is loud, not silent.
//
// External-link rule (DESIGN.md §4.4): every glossary URL opens in a
// new tab with `rel="noopener noreferrer"`. The `external` flag below
// is structural metadata in case a future mostly-internal entry
// needs in-tab navigation; today every entry is external.

export interface GlossaryEntry {
  /** Hover-tooltip body — the canonical name + one-line explainer. */
  readonly name: string;
  /** Canonical reference URL (RFC, W3C TR, vendor docs, etc.). */
  readonly href: string;
  /** True when the link opens in a new tab. Default true site-wide. */
  readonly external: boolean;
}

export type GlossaryTerm = keyof typeof GLOSSARY;

/**
 * Canonical glossary. Ports the new-design GLOSSARY map and extends
 * it to cover every acronym surfaced on a marketing route — see the
 * resolved Open question 3 in the /platform redesign hand-off.
 */
export const GLOSSARY = {
  // ---------------- OAuth / OIDC family ----------------
  OIDC: {
    name: "OpenID Connect — identity layer on top of OAuth 2.0",
    href: "https://openid.net/developers/how-connect-works/",
    external: true,
  },
  "OIDC 2.1": {
    name: "OpenID Connect 2.1 — consolidated profile with OAuth 2.1 hardening",
    href: "https://openid.net/specs/openid-connect-core-1_0.html",
    external: true,
  },
  OAuth: {
    name: "OAuth 2.1 — delegated authorization framework",
    href: "https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/",
    external: true,
  },
  GNAP: {
    name: "Grant Negotiation & Authorization Protocol — RFC 9635",
    href: "https://datatracker.ietf.org/doc/html/rfc9635",
    external: true,
  },
  PAR: {
    name: "Pushed Authorization Requests — RFC 9126",
    href: "https://datatracker.ietf.org/doc/html/rfc9126",
    external: true,
  },
  JAR: {
    name: "JWT-Secured Authorization Request — RFC 9101",
    href: "https://datatracker.ietf.org/doc/html/rfc9101",
    external: true,
  },
  JARM: {
    name: "JWT-Secured Authorization Response Mode",
    href: "https://openid.net/specs/oauth-v2-jarm.html",
    external: true,
  },
  DPoP: {
    name: "Demonstrating Proof-of-Possession — RFC 9449",
    href: "https://datatracker.ietf.org/doc/html/rfc9449",
    external: true,
  },
  RAR: {
    name: "Rich Authorization Requests — RFC 9396",
    href: "https://datatracker.ietf.org/doc/html/rfc9396",
    external: true,
  },
  mTLS: {
    name: "Mutual TLS client authentication — RFC 8705",
    href: "https://datatracker.ietf.org/doc/html/rfc8705",
    external: true,
  },
  JWT: {
    name: "JSON Web Token — RFC 7519",
    href: "https://datatracker.ietf.org/doc/html/rfc7519",
    external: true,
  },
  JWKS: {
    name: "JSON Web Key Set — RFC 7517",
    href: "https://datatracker.ietf.org/doc/html/rfc7517",
    external: true,
  },

  // ---------------- Authentication / proofing ----------------
  MFA: {
    name: "Multi-Factor Authentication",
    href: "https://pages.nist.gov/800-63-4/sp800-63b.html",
    external: true,
  },
  WebAuthn: {
    name: "W3C Web Authentication — passkey-capable browser API",
    href: "https://www.w3.org/TR/webauthn-3/",
    external: true,
  },
  KMS: {
    name: "Key Management System",
    href: "https://en.wikipedia.org/wiki/Key_management",
    external: true,
  },
  HSM: {
    name: "Hardware Security Module",
    href: "https://en.wikipedia.org/wiki/Hardware_security_module",
    external: true,
  },
  TPM: {
    name: "Trusted Platform Module",
    href: "https://trustedcomputinggroup.org/work-groups/trusted-platform-module/",
    external: true,
  },

  // ---------------- Verifiable credentials ----------------
  ZKP: {
    name: "Zero-Knowledge Proof",
    href: "https://en.wikipedia.org/wiki/Zero-knowledge_proof",
    external: true,
  },
  DID: {
    name: "Decentralized Identifier — W3C DID Core 1.0",
    href: "https://www.w3.org/TR/did-core/",
    external: true,
  },
  DIDs: {
    name: "Decentralized Identifiers — W3C DID Core 1.0",
    href: "https://www.w3.org/TR/did-core/",
    external: true,
  },
  VC: {
    name: "Verifiable Credential — W3C VC Data Model 2.0",
    href: "https://www.w3.org/TR/vc-data-model-2.0/",
    external: true,
  },
  VCs: {
    name: "Verifiable Credentials — W3C VC Data Model 2.0",
    href: "https://www.w3.org/TR/vc-data-model-2.0/",
    external: true,
  },
  "SD-JWT": {
    name: "Selective Disclosure JWT",
    href: "https://datatracker.ietf.org/doc/draft-ietf-oauth-selective-disclosure-jwt/",
    external: true,
  },
  "BBS+": {
    name: "BBS+ signatures — unlinkable ZK credentials",
    href: "https://identity.foundation/bbs-signature/draft-irtf-cfrg-bbs-signatures.html",
    external: true,
  },
  OID4VCI: {
    name: "OpenID for Verifiable Credential Issuance",
    href: "https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html",
    external: true,
  },
  OID4VP: {
    name: "OpenID for Verifiable Presentations",
    href: "https://openid.net/specs/openid-4-verifiable-presentations-1_0.html",
    external: true,
  },
  OID4VC: {
    name: "OpenID for Verifiable Credentials",
    href: "https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html",
    external: true,
  },
  StatusList2021: {
    name: "W3C Status List 2021 — privacy-preserving revocation",
    href: "https://www.w3.org/TR/vc-status-list/",
    external: true,
  },

  // ---------------- Authorization / policy ----------------
  ReBAC: {
    name: "Relationship-Based Access Control",
    href: "https://en.wikipedia.org/wiki/Relationship-based_access_control",
    external: true,
  },
  ABAC: {
    name: "Attribute-Based Access Control",
    href: "https://csrc.nist.gov/publications/detail/sp/800-162/final",
    external: true,
  },
  RBAC: {
    name: "Role-Based Access Control",
    href: "https://csrc.nist.gov/projects/role-based-access-control",
    external: true,
  },
  Zanzibar: {
    name: "Google Zanzibar — graph ReBAC",
    href: "https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/",
    external: true,
  },
  Cedar: {
    name: "Cedar — Amazon policy language",
    href: "https://www.cedarpolicy.com/",
    external: true,
  },
  OPA: {
    name: "Open Policy Agent",
    href: "https://www.openpolicyagent.org/",
    external: true,
  },
  Rego: {
    name: "Rego — OPA policy language",
    href: "https://www.openpolicyagent.org/docs/latest/policy-language/",
    external: true,
  },
  XACML: {
    name: "eXtensible Access Control Markup Language",
    href: "https://www.oasis-open.org/committees/xacml/",
    external: true,
  },
  PAP: {
    name: "Policy Administration Point",
    href: "https://csrc.nist.gov/publications/detail/sp/800-162/final",
    external: true,
  },
  PDP: {
    name: "Policy Decision Point",
    href: "https://csrc.nist.gov/publications/detail/sp/800-162/final",
    external: true,
  },
  PEP: {
    name: "Policy Enforcement Point",
    href: "https://csrc.nist.gov/publications/detail/sp/800-162/final",
    external: true,
  },
  PEPs: {
    name: "Policy Enforcement Points",
    href: "https://csrc.nist.gov/publications/detail/sp/800-162/final",
    external: true,
  },

  // ---------------- Standards bodies / regulations ----------------
  NIST: {
    name: "U.S. National Institute of Standards and Technology",
    href: "https://www.nist.gov/",
    external: true,
  },
  "NIST 800-63": {
    name: "NIST SP 800-63 — Digital Identity Guidelines",
    href: "https://pages.nist.gov/800-63-4/",
    external: true,
  },
  IAL: {
    name: "Identity Assurance Level — NIST 800-63A",
    href: "https://pages.nist.gov/800-63-4/sp800-63a.html",
    external: true,
  },
  IAL2: {
    name: "NIST IAL2 — evidence-backed proofing",
    href: "https://pages.nist.gov/800-63-4/sp800-63a.html",
    external: true,
  },
  IAL3: {
    name: "NIST IAL3 — in-person / supervised proofing",
    href: "https://pages.nist.gov/800-63-4/sp800-63a.html",
    external: true,
  },
  eIDAS: {
    name: "EU eID & trust services regulation",
    href: "https://eur-lex.europa.eu/eli/reg/2024/1183/oj",
    external: true,
  },
  KYC: {
    name: "Know Your Customer",
    href: "https://en.wikipedia.org/wiki/Know_your_customer",
    external: true,
  },
  AML: {
    name: "Anti-Money Laundering",
    href: "https://www.fincen.gov/",
    external: true,
  },

  // ---------------- IAM / general technology ----------------
  IAM: {
    name: "Identity & Access Management",
    href: "https://csrc.nist.gov/glossary/term/identity_access_management",
    external: true,
  },
  CIAM: {
    name: "Customer Identity & Access Management",
    href: "https://www.gartner.com/en/information-technology/glossary/customer-identity-access-management-ciam",
    external: true,
  },
  AuthN: {
    name: "Authentication",
    href: "https://en.wikipedia.org/wiki/Authentication",
    external: true,
  },
  AuthZ: {
    name: "Authorization",
    href: "https://en.wikipedia.org/wiki/Authorization",
    external: true,
  },
  SAML: {
    name: "Security Assertion Markup Language 2.0",
    href: "https://www.oasis-open.org/standards#samlv2.0",
    external: true,
  },
  API: {
    name: "Application Programming Interface",
    href: "https://en.wikipedia.org/wiki/API",
    external: true,
  },
  APIs: {
    name: "Application Programming Interfaces",
    href: "https://en.wikipedia.org/wiki/API",
    external: true,
  },
  SDK: {
    name: "Software Development Kit",
    href: "https://en.wikipedia.org/wiki/Software_development_kit",
    external: true,
  },
  SDKs: {
    name: "Software Development Kits",
    href: "https://en.wikipedia.org/wiki/Software_development_kit",
    external: true,
  },
  CLI: {
    name: "Command-Line Interface",
    href: "https://en.wikipedia.org/wiki/Command-line_interface",
    external: true,
  },
  GraphQL: {
    name: "GraphQL",
    href: "https://graphql.org/",
    external: true,
  },
  REST: {
    name: "Representational State Transfer",
    href: "https://en.wikipedia.org/wiki/REST",
    external: true,
  },
  MVP: {
    name: "Minimum Viable Product",
    href: "https://en.wikipedia.org/wiki/Minimum_viable_product",
    external: true,
  },
  RFC: {
    name: "Request for Comments — IETF standards",
    href: "https://www.rfc-editor.org/",
    external: true,
  },
  LTS: {
    name: "Long-Term Support",
    href: "https://en.wikipedia.org/wiki/Long-term_support",
    external: true,
  },

  // ---------------- Roles / abbreviations ----------------
  CSR: {
    name: "Customer Service Representative",
    href: "https://en.wikipedia.org/wiki/Customer_service_representative",
    external: true,
  },
  CFO: {
    name: "Chief Financial Officer",
    href: "https://en.wikipedia.org/wiki/Chief_financial_officer",
    external: true,
  },

  // ---------------- Standards orgs ----------------
  IETF: {
    name: "Internet Engineering Task Force",
    href: "https://www.ietf.org/",
    external: true,
  },
  W3C: {
    name: "World Wide Web Consortium",
    href: "https://www.w3.org/",
    external: true,
  },
  OpenID: {
    name: "OpenID Foundation",
    href: "https://openid.net/foundation/",
    external: true,
  },
  OIDF: {
    name: "OpenID Foundation",
    href: "https://openid.net/foundation/",
    external: true,
  },
  OASIS: {
    name: "Organization for the Advancement of Structured Information Standards",
    href: "https://www.oasis-open.org/",
    external: true,
  },
} as const satisfies Record<string, GlossaryEntry>;

/**
 * Lookup helper — returns `undefined` for unknown terms. Standard.astro
 * logs a build-time warning when this returns undefined so misses are
 * loud (the JSX renders the literal text, not a broken chip).
 */
export function lookupGlossary(term: string): GlossaryEntry | undefined {
  return (GLOSSARY as Record<string, GlossaryEntry>)[term];
}
