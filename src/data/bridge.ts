// USMR Phase 5.2.8 — Bridge route data registry. Ports the inline
// data from new-design/extracted/src/components/Bridge.jsx (the
// canonical OID4VP→OIDC bridge composition).
//
// Three parties, four protocol steps. Each step's `nodeId` points
// at the party it activates during the auto-cycle so the React
// island can highlight the right card mid-step.

import type { GlossaryTerm } from "./glossary.js";

export interface BridgeParty {
  id: BridgePartyId;
  /** Eyebrow label above the title (mono-uppercase). */
  role: "Relying party" | "Trust service" | "Holder";
  /** Slot text — supports inline glossary chips via tokens. */
  label: readonly LabelNode[];
  /** Sub-line under the title (mono-italic, --fg-3). */
  sub: readonly LabelNode[];
}

export type BridgePartyId = "app" | "artagon" | "wallet";

export interface BridgeStep {
  /** "1" / "2" / "3" / "4" — mono prefix on the step header. */
  num: string;
  /** Bold step title. */
  title: string;
  /** Description with inline glossary chips via tokens. */
  desc: readonly LabelNode[];
  /** Which party this step activates. */
  nodeId: BridgePartyId;
}

/** Inline label/desc tokens — text segments + glossary terms. */
export type LabelNode =
  | { kind: "text"; value: string }
  | { kind: "term"; value: GlossaryTerm | string };

const t = (value: string): LabelNode => ({ kind: "term", value });
const txt = (value: string): LabelNode => ({ kind: "text", value });

export const PARTIES: readonly [BridgeParty, BridgeParty, BridgeParty] = [
  {
    id: "app",
    role: "Relying party",
    label: [txt("Your "), t("OIDC"), txt(" App")],
    sub: [txt("unchanged")],
  },
  {
    id: "artagon",
    role: "Trust service",
    label: [txt("Artagon")],
    sub: [txt("verifier + bridge")],
  },
  {
    id: "wallet",
    role: "Holder",
    label: [txt("User's Wallet")],
    sub: [txt("holds "), t("VCs")],
  },
] as const;

export const STEPS: readonly [BridgeStep, BridgeStep, BridgeStep, BridgeStep] =
  [
    {
      num: "1",
      title: "Legacy login",
      desc: [
        txt("App initiates standard "),
        t("OIDC"),
        txt(" auth flow — no code change."),
      ],
      nodeId: "app",
    },
    {
      num: "2",
      title: "VC request",
      desc: [
        txt("Artagon challenges wallet via "),
        t("OID4VP"),
        txt(" for required claims."),
      ],
      nodeId: "wallet",
    },
    {
      num: "3",
      title: "Verify",
      desc: [
        txt("Artagon verifies "),
        t("VC"),
        txt(" signatures, revocation, issuer trust."),
      ],
      nodeId: "artagon",
    },
    {
      num: "4",
      title: "Mint token",
      desc: [
        txt("Standard "),
        t("OIDC"),
        txt(
          " ID Token issued with cryptographically-verified claims embedded.",
        ),
      ],
      nodeId: "app",
    },
  ] as const;
