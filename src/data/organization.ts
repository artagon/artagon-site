// USMR Phase 5.1b — Organization-level metadata. Single source of truth for
// the published contact addresses, location, and security-disclosure
// footnote. Consumed by the home on-ramp card today; future routes
// (`/security`, footer, JSON-LD structured data) should pull from the same
// `ORG` const rather than hard-coding strings.

export type OrgContact = {
  /** Display label, e.g. "Enterprise". Non-empty. */
  label: string;
  /** Canonical address, URL, or location string. Non-empty. */
  value: string;
};

/** Non-empty array — at least one contact must exist. */
export type Organization = {
  contacts: readonly [OrgContact, ...OrgContact[]];
  /** Optional note rendered below contact mini-cards. Non-empty if present. */
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

// Module-load runtime gate: catches an empty value or whitespace-only string
// at content-load time (faster failure than waiting for the snapshot diff).
for (const c of ORG.contacts) {
  if (c.label.trim() === "" || c.value.trim() === "") {
    throw new Error(
      `[ORG] empty contact field: ${JSON.stringify(c)} — every label/value must be a non-empty string.`,
    );
  }
}
if (ORG.contactFootnote !== undefined && ORG.contactFootnote.trim() === "") {
  throw new Error(
    "[ORG] contactFootnote is set but empty — drop the key or set a non-empty string.",
  );
}
