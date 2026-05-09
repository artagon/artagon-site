// USMR Phase 5.7 — /roadmap data registry. Ports the inline PHASES
// + STATUS map from new-design/extracted/src/components/Roadmap.jsx.
// Replaces the earlier `Phase` shape (5.1c-era stub with kpis[] +
// horizon strings) with the canonical 5-tuple horizontal-timeline
// data. The old `kpis` field was never consumed downstream and is
// dropped; the canonical roadmap surfaces scope items only.

export type RoadmapStatus = "shipping" | "in-build" | "design" | "planned";

export interface RoadmapPhase {
  /** Anchor id (lowercase v1-v5) — preserved across the 5.1c → 5.7 migration so any external `/roadmap#v3` deep links keep resolving. */
  id: "v1" | "v2" | "v3" | "v4" | "v5";
  /** Mono prefix in the card header. */
  version: "V1" | "V2" | "V3" | "V4" | "V5";
  /** Time band — top-right of the card header. */
  when: string;
  /** Bold card title. */
  title: string;
  status: RoadmapStatus;
  /** Bulleted scope list. */
  items: readonly string[];
}

export interface RoadmapStatusMeta {
  /** Token reference for the dot fill + status label color. */
  colorToken: "--ok" | "--accent" | "--warn" | "--fg-3";
  /** Mono-uppercase status label rendered next to the dot. */
  label: "Shipping" | "In build" | "Design" | "Planned";
}

export const ROADMAP_STATUS: Record<RoadmapStatus, RoadmapStatusMeta> = {
  shipping: { colorToken: "--ok", label: "Shipping" },
  "in-build": { colorToken: "--accent", label: "In build" },
  design: { colorToken: "--warn", label: "Design" },
  planned: { colorToken: "--fg-3", label: "Planned" },
};

export const ROADMAP_PHASES: readonly [
  RoadmapPhase,
  RoadmapPhase,
  RoadmapPhase,
  RoadmapPhase,
  RoadmapPhase,
] = [
  {
    id: "v1",
    version: "V1",
    when: "0–3 mo",
    title: "Core Trust Layer",
    status: "shipping",
    items: [
      "OIDC 2.1 / GNAP MVP",
      "Hardened profiles (PAR/JAR/DPoP/RAR/mTLS)",
      "Passkey-primary auth",
      "Device attestation (Apple App Attest)",
    ],
  },
  {
    id: "v2",
    version: "V2",
    when: "3–6 mo",
    title: "VC Layer",
    status: "in-build",
    items: [
      "SD-JWT issuance via OID4VCI",
      "OID4VP verification",
      "OIDC bridge for legacy apps",
      "StatusList2021 revocation",
    ],
  },
  {
    id: "v3",
    version: "V3",
    when: "6–9 mo",
    title: "Policy Engine",
    status: "design",
    items: [
      "Zanzibar graph store",
      "Polyglot PDP — Cedar / OPA / XACML",
      "PEP SDKs × 5",
      "Git-backed PAP",
    ],
  },
  {
    id: "v4",
    version: "V4",
    when: "9–12 mo",
    title: "Proofing & Network",
    status: "design",
    items: [
      "Pluggable proofing API",
      "Proofing VC (NIST IAL2/3)",
      "VC trust registry",
    ],
  },
  {
    id: "v5",
    version: "V5",
    when: "12–18 mo",
    title: "Federation & AI",
    status: "planned",
    items: [
      "Multi-issuer trust registry",
      "BBS+ unlinkable ZKP",
      "Autonomous agent DIDs",
      "DelegationVC cross-domain",
    ],
  },
] as const;
