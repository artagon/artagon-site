// USMR Phase 5.1b — Organization-level metadata. Single source of truth for
// contact addresses, location, and security disclosure URL. Consumed by the
// home on-ramp card today; future routes (`/security`, footer, JSON-LD
// structured data) should pull from the same `ORG` const rather than
// hard-coding strings.

export type OrgContact = {
  /** Display label, e.g. "Enterprise". */
  label: string;
  /** Canonical address, URL, or location string. */
  value: string;
};

export type Organization = {
  contacts: OrgContact[];
  /** Optional note rendered below contact mini-cards. */
  contactFootnote?: string;
};

export const ORG: Organization = {
  contacts: [
    { label: "Enterprise", value: "enterprise@artagon.com" },
    { label: "General", value: "info@artagon.com" },
    { label: "Security", value: "security@artagon.com" },
    { label: "Location", value: "Philadelphia, Pennsylvania" },
  ],
  contactFootnote:
    "PGP key & security disclosure policy at artagon.com/.well-known",
};
