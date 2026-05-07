// USMR Phase 5.3 — /use-cases data registry. Ports the inline
// CASES from new-design/extracted/src/components/UseCases.jsx.
// 4 scenarios, each with a metrics row (3 KV pairs) + ordered
// protocol trace. The trace's last line is rendered in accent
// color by the renderer (the canonical "decision" line).

export type UseCaseId = "csr" | "specialist" | "valet" | "ai";

export interface UseCaseMetric {
  /** Mono-uppercase eyebrow (e.g. "Setup", "Audit", "Scope"). */
  key: string;
  /** Bold value (e.g. "0 lines changed", "Cryptographic"). */
  value: string;
}

export interface UseCaseScenario {
  id: UseCaseId;
  /** Tab label in the left rail. */
  label: string;
  /** Mono-uppercase scenario taxonomy. */
  short: string;
  /** Big serif headline for the right panel. */
  title: string;
  /** Long-form scenario paragraph. */
  scenario: string;
  /** Ordered protocol trace lines — last one is the decision (rendered in accent). */
  trace: readonly string[];
  /** 3 metric KVs rendered as a divider strip. */
  metrics: readonly [UseCaseMetric, UseCaseMetric, UseCaseMetric];
}

export const USE_CASES: readonly [
  UseCaseScenario,
  UseCaseScenario,
  UseCaseScenario,
  UseCaseScenario,
] = [
  {
    id: "csr",
    label: "CSR Delegation",
    short: "Human → Human, same domain",
    title: "Act on behalf, with consent, in seconds.",
    scenario:
      "Customer-service rep Alice needs to view Bob's account. Instead of impersonation or shared passwords, Alice issues a GNAP grant request. Bob approves on his passkey-bound app — 15 minutes, view-only.",
    trace: [
      'POST /gnap/grants  →  { type: "act_on_behalf", subject: bob, ttl: "PT15M" }',
      'push.send(bob.device, "Allow alice@acme to view your account?")',
      "zanzibar.write (alice, is_temp_delegate_for, bob)",
      "issue DelegationVC  ⚑ bound_to=alice.dpop.jkt",
      "PEP  check → rebac ✓  ·  abac ✓ (scope,ip,ttl)  ·  decision=PERMIT",
    ],
    metrics: [
      { key: "Setup", value: "0 lines changed" },
      { key: "Audit", value: "Cryptographic" },
      { key: "Scope", value: "Least-privilege" },
    ],
  },
  {
    id: "specialist",
    label: "Specialist Consult",
    short: "Human → Human, cross-domain",
    title: "Cross-domain sharing. No SAML federation.",
    scenario:
      "Dr. Evans at General Hospital grants Dr. Smith at Heart Clinic read access to patient file 456. The orgs share nothing — no federation, no guest accounts. Dr. Smith arrives holding her clinic's DoctorVC.",
    trace: [
      "evans.delegate.add (did:web:heart-clinic.com:dr-smith)",
      "zanzibar.write (did:…dr-smith, is_viewer_for, patient_456)",
      "smith → file.get()  →  challenge (OID4VP, require DoctorVC)",
      "verify DoctorVC  ⚑ iss=trusted  ·  sig ✓  ·  not revoked",
      "PEP  check → rebac ✓  ·  abac ✓ (issuer trust)  ·  decision=PERMIT",
    ],
    metrics: [
      { key: "Onboarding", value: "None" },
      { key: "Trust root", value: "Issuer VC" },
      { key: "Federation", value: "Not required" },
    ],
  },
  {
    id: "valet",
    label: "Valet Key",
    short: "Human → Machine, ephemeral",
    title: "Fine-grained access for third-party apps.",
    scenario:
      'User grants "Finance Analyzer" one-time read access to 90 days of transactions. No broad bearer token, no credential sharing — a capability VC bound to the app\'s attested key.',
    trace: [
      'gnap.request { resource:"txns", action:"read", window:"P90D" }',
      "user.consent (explicit, itemized)",
      "issue DelegationVC  ⚑ bound_to=app.attested_key · expires=P1D",
      "app → api.txns.get()  +  DPoP proof  +  DelegationVC",
      "PEP  check → vc ✓  ·  dpop binding ✓  ·  scope ✓  ·  decision=PERMIT",
    ],
    metrics: [
      { key: "Token", value: "Capability VC" },
      { key: "Binding", value: "Attested key" },
      { key: "Revocable", value: "Yes, instant" },
    ],
  },
  {
    id: "ai",
    label: "AI Agent",
    short: "Human → Autonomous machine",
    title: "A cryptographic leash for AI.",
    scenario:
      "CFO authorizes an AI Procurement Agent to sign contracts under $50k. Agent holds its own DID and TPM-bound keys; attestation proves software integrity on every call. Policy is Cedar.",
    trace: [
      "agent.did  =  did:key:zDnae…  (TPM-rooted)",
      "issue DelegationVC  ⚑ policy_ref=cedar/p-123 · long-lived",
      "agent → procure.sign(contract, $45k)  +  attestation  +  VC",
      'cedar.eval: permit when (action=="sign") && (value < 50000)  →  ✓',
      "agent → procure.sign(contract, $75k)  →  Cedar DENIED · audit logged",
    ],
    metrics: [
      { key: "Identity", value: "DID + TPM" },
      { key: "Authority", value: "VC + Cedar" },
      { key: "Audit", value: "Per-decision" },
    ],
  },
] as const;
