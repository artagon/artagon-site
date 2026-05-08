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
    "Security disclosure policy at artagon.com/security; .well-known/security.txt is the discovery endpoint.",
};

// Module-load runtime gate. Fires once at first import (Astro/Vite eagerly
// evaluate the module graph during `astro build`), aggregating all
// violations into a single error so the developer fixes them in one pass
// instead of build → fix → rebuild for each row.
const validationErrors: string[] = [];
for (const [i, c] of ORG.contacts.entries()) {
  if (c.label.trim() === "")
    validationErrors.push(`contacts[${i}].label is empty or whitespace-only`);
  if (c.value.trim() === "")
    validationErrors.push(
      `contacts[${i}].value is empty or whitespace-only (label: ${c.label})`,
    );
}
if (ORG.contactFootnote !== undefined && ORG.contactFootnote.trim() === "") {
  validationErrors.push(
    "contactFootnote is set but empty — drop the key or set a non-empty string",
  );
}
if (validationErrors.length > 0) {
  throw new Error(
    `src/data/organization.ts: ${validationErrors.length} ORG validation error${validationErrors.length === 1 ? "" : "s"}:\n  - ${validationErrors.join("\n  - ")}`,
  );
}
