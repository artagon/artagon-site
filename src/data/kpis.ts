// USMR Phase 5.1n — KPI registry. The KPI band shipped pre-USMR on the
// home `/` is removed in 5.1n (legacy section prune); this typed const
// preserves the numbers so Phase 5.2 (`/platform` redesign) can re-render
// them in the platform pillar tri-band without re-typing the metrics.

export type KPI = {
  /** Eyebrow label (e.g., "Decision latency"). */
  eyebrow: string;
  /** Headline number / target (e.g., "< 10 ms p95"). */
  value: string;
  /** Discrete one-line context (e.g., "Policy + graph"). */
  detail: string;
};

export const KPIS: readonly KPI[] = [
  {
    eyebrow: "Decision latency",
    value: "< 10 ms p95",
    detail: "Policy + graph",
  },
  {
    eyebrow: "Token issuance",
    value: "< 120 ms p95",
    detail: "DPoP / mTLS bound",
  },
  {
    eyebrow: "VC verification",
    value: "< 150 ms p95",
    detail: "SD-JWT & BBS+",
  },
  {
    eyebrow: "Availability",
    value: "99.95%",
    detail: "Multi-region",
  },
] as const;
