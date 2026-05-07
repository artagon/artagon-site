// USMR Phase 5.1d — Trust-chain data registry. The home hero renders these
// as a static stage list (Phase 5.1d-static) and later upgrades to an
// interactive React island that animates stage-by-stage and lets visitors
// page through scenarios (Phase 5.1d-react). The same registry feeds the
// `/platform` deep-dive in Phase 5.2 so the chain narrative stays coherent
// across the home overview and the platform pillar pages.

export type StageOutcome = "pass" | "fail" | "skip";
export type Decision = "PERMIT" | "DENY";

export type TrustStage = {
  /** Stable identifier used for ARIA labels, DOM ids, and #anchors. */
  id: "passkey" | "device" | "dpop" | "vc" | "policy";
  /** Display label, e.g. "Passkey". */
  label: string;
  /** One-line context under the label. */
  sub: string;
  /** Pass-state claim string (cryptographic evidence reference). */
  pass: string;
  /** Fail-state claim string. */
  fail: string;
};

export type TrustScenario = {
  /** Stable identifier used for the scenario picker dot. */
  id: string;
  /** Short label shown in the scenario picker. */
  label: string;
  /** One-line scenario context. */
  context: string;
  /**
   * Per-stage outcomes. Length MUST match STAGES.length and is enforced by
   * the trust-chain-data.test.mts shape gate.
   */
  stages: readonly StageOutcome[];
  decision: Decision;
  /** Plain-English reason the chain reached this decision. */
  reason: string;
  /** Composed claim string shown in the final decision card. */
  finalClaim: string;
};

export const STAGES: readonly TrustStage[] = [
  {
    id: "passkey",
    label: "Passkey",
    sub: "Unphishable user",
    pass: "user.webauthn.verified",
    fail: "user.webauthn.failed",
  },
  {
    id: "device",
    label: "Device Attest.",
    sub: "Hardware-rooted",
    pass: "device.tpm.verified",
    fail: "device.integrity=false",
  },
  {
    id: "dpop",
    label: "DPoP Key",
    sub: "Token-bound",
    pass: "client.dpop.jkt=…a3f",
    fail: "client.dpop.mismatch",
  },
  {
    id: "vc",
    label: "Presented VC",
    sub: "SD-JWT / BBS+",
    pass: "vc.proofing.IAL2",
    fail: "vc.proofing.insufficient",
  },
  {
    id: "policy",
    label: "Policy Decision",
    sub: "Zanzibar + Cedar",
    pass: "decision=PERMIT (2.3ms)",
    fail: "decision=DENY · policy",
  },
] as const;

export const SCENARIOS: readonly TrustScenario[] = [
  {
    id: "healthy",
    label: "Employee · morning login",
    context: "employee · office network · managed laptop",
    stages: ["pass", "pass", "pass", "pass", "pass"],
    decision: "PERMIT",
    reason: "all 5 proofs cryptographically composed",
    finalClaim: "decision=PERMIT · latency=2.3ms",
  },
  {
    id: "device_fail",
    label: "Jailbroken phone · blocked",
    context: "customer · public Wi-Fi · rooted Android",
    stages: ["pass", "fail", "skip", "skip", "skip"],
    decision: "DENY",
    reason:
      "device attestation failed — Play Integrity MEETS_DEVICE_INTEGRITY=false",
    finalClaim: "decision=DENY · device.integrity=false",
  },
  {
    id: "ial_insufficient",
    label: "Wire transfer · missing IAL3",
    context: "customer · high-risk action · $250k wire",
    stages: ["pass", "pass", "pass", "fail", "skip"],
    decision: "DENY",
    reason: "presented VC is IAL2, policy requires IAL3 for this action",
    finalClaim: "decision=DENY · step-up required: IAL3",
  },
  {
    id: "token_replay",
    label: "Token replay · bound key mismatch",
    context: "agent · datacenter B · replayed token",
    stages: ["pass", "pass", "fail", "skip", "skip"],
    decision: "DENY",
    reason: "DPoP proof jkt does not match token cnf.jkt — replay rejected",
    finalClaim: "decision=DENY · dpop.binding=invalid",
  },
  {
    id: "policy_deny",
    label: "Cross-tenant · policy denies",
    context: "support agent · cross-tenant read · no delegation",
    stages: ["pass", "pass", "pass", "pass", "fail"],
    decision: "DENY",
    reason: "no delegation VC present; Cedar policy forbids cross-tenant read",
    finalClaim: "decision=DENY · policy=TENANT_ISOLATION",
  },
  {
    id: "delegated_permit",
    label: "CSR on-behalf-of · scoped PERMIT",
    context: "CSR · customer delegation VC · read-only",
    stages: ["pass", "pass", "pass", "pass", "pass"],
    decision: "PERMIT",
    reason:
      "delegation VC valid; Zanzibar relation=assists · Cedar allows read",
    finalClaim: "decision=PERMIT · scope=read-only · 4.1ms",
  },
] as const;
