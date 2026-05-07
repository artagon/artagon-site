// USMR Phase 5.1c — Pillar grid registry. The home page renders these as a
// 3-card overview keyed by stable id strings.

export type Pillar = {
  /** Stable identifier used for the rendered card id (#pillar-identity, etc.) and for any future cross-route anchor convention. */
  id: "identity" | "credentials" | "authorization";
  eyebrow: string;
  title: string;
  body: string;
};

export const PILLARS: readonly Pillar[] = [
  {
    id: "identity",
    eyebrow: "Unified OP / AS",
    title: "OIDC 2.1 + GNAP",
    body: "Hardened OAuth profiles (PAR · JAR/JARM · RAR · DPoP · mTLS), GNAP PoP & continuation, client key rotation.",
  },
  {
    id: "credentials",
    eyebrow: "Verifiable Identity",
    title: "Selective disclosure",
    body: "Issue SD‑JWT & BBS+ VCs, verify via OID4VCI/VP, unlinkable presentations, revocation with StatusList2021 and Merkle proofs.",
  },
  {
    id: "authorization",
    eyebrow: "Policy & Graph",
    title: "Zanzibar‑style checks",
    body: "Relationship graph as fast path with PDP overlays (XACML · Cedar · OPA), obligations for redaction, masking, quotas, and consent.",
  },
] as const;
