// USMR Phase 5.1k — Affiliations ticker registry. The home hero renders
// these as a horizontal cluster of dotted-underline external links below
// the CTAs ("Implements & contributes to ..."). Each entry cites the
// canonical spec the platform conforms to or contributes to.
//
// `title` is the hover-tooltip citation per DESIGN.md §"External links"
// link-pattern style — gives screen-reader users + power-user mouse
// users the spec citation without leaving the page.

export type Affiliation = {
  /** Display label (compact). */
  label: string;
  /** Canonical spec URL. */
  href: string;
  /** Hover/SR citation explaining what the link goes to. */
  title: string;
};

export const AFFILIATIONS: readonly Affiliation[] = [
  {
    label: "IETF GNAP",
    href: "https://datatracker.ietf.org/doc/html/rfc9635",
    title: "IETF · RFC 9635 · Grant Negotiation & Authorization Protocol",
  },
  {
    label: "OpenID OID4VC",
    href: "https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html",
    title: "OpenID Foundation · OID4VCI / VP",
  },
  {
    label: "W3C DIDs",
    href: "https://www.w3.org/TR/did-core/",
    title: "W3C · Decentralized Identifiers 1.0",
  },
  {
    label: "W3C VCs",
    href: "https://www.w3.org/TR/vc-data-model-2.0/",
    title: "W3C · Verifiable Credentials Data Model",
  },
  {
    label: "NIST 800-63",
    href: "https://pages.nist.gov/800-63-4/",
    title: "NIST SP 800-63 · Digital Identity Guidelines",
  },
  {
    label: "eIDAS 2",
    href: "https://eur-lex.europa.eu/eli/reg/2024/1183/oj",
    title: "EU · eIDAS 2.0 Regulation (EU) 2024/1183",
  },
] as const;

// USMR Phase 5.1k — Hero meta-strip standards row. Center slot of the
// strip above the hero. Smaller set than AFFILIATIONS — these are the
// five core specs the trust-chain composes; AFFILIATIONS adds the
// W3C/NIST/eIDAS layer below the CTAs.
export type HeroSpecLink = {
  label: string;
  href: string;
  title: string;
};

export const HERO_SPECS: readonly HeroSpecLink[] = [
  {
    label: "OIDC",
    href: "https://openid.net/specs/openid-connect-core-1_0.html",
    title: "OpenID Connect — spec at openid.net",
  },
  {
    label: "GNAP",
    href: "https://datatracker.ietf.org/doc/html/rfc9635",
    title: "GNAP — RFC 9635 · Grant Negotiation & Authorization Protocol",
  },
  {
    label: "OID4VC",
    href: "https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html",
    title: "OpenID for Verifiable Credentials (OID4VCI / OID4VP)",
  },
  {
    label: "Zanzibar",
    href: "https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/",
    title: "Zanzibar — Google's global authorization system",
  },
  {
    label: "Cedar",
    href: "https://www.cedarpolicy.com/",
    title: "Cedar — Amazon's policy language",
  },
] as const;
