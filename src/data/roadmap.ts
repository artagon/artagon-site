export type Phase = {
  id: string;
  phase: string;
  horizon: string;
  focus: string;
  milestones: string[];
  kpis: string[];
};

export const ROADMAP: Phase[] = [
  {
    id: "v1",
    phase: "V1",
    horizon: "0–3 months",
    focus: "Core Trust Layer",
    milestones: [
      "OIDC/GNAP MVP",
      "DPoP, PAR, JAR/JARM",
      "JWKS & Attestation MVP",
    ],
    kpis: ["OIDC conformance %", "Latency p95"],
  },
  {
    id: "v2",
    phase: "V2",
    horizon: "3–6 months",
    focus: "Verifiable Credentials Layer",
    milestones: [
      "OID4VCI (SD‑JWT) issuance",
      "OID4VP verification",
      "StatusList2021 revocation",
    ],
    kpis: ["VC throughput ops/sec"],
  },
  {
    id: "v3",
    phase: "V3",
    horizon: "6–9 months",
    focus: "Policy & Graph Engine",
    milestones: [
      "PDP (XACML/Cedar/OPA)",
      "Zanzibar graph store",
      "API SDKs / PEPs",
    ],
    kpis: ["Decision p95 < 10 ms"],
  },
  {
    id: "v4",
    phase: "V4",
    horizon: "9–12 months",
    focus: "Identity Proofing & VC Network",
    milestones: [
      "Pluggable Proofing API",
      "Proofing VC issuance",
      "VC trust registry",
    ],
    kpis: ["Proofing success rate %"],
  },
  {
    id: "v5",
    phase: "V5",
    horizon: "12–18 months",
    focus: "Federation & AI Agents",
    milestones: [
      "Multi‑issuer trust registry",
      "Autonomous agent keys",
      "BBS+ / ZKP credentials",
    ],
    kpis: ["Federated issuers count"],
  },
];
