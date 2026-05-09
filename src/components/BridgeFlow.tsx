// USMR Phase 5.2.8 — /bridge route flow visualization (React island,
// hydrated via `client:visible`). Ports the new-design Bridge.jsx
// composition (new-design/extracted/src/components/Bridge.jsx) to a
// token-only implementation.
//
// Behaviour:
//   - 4-step protocol cycle on a 2200 ms timer (matches the canonical
//     `setInterval(setStep(s => (s + 1) % 4), 2200)`).
//   - Each step activates one of 3 parties via the `nodeId` pointer
//     — the activated card gets accent-tinted background + accent
//     border, the inactive cards stay neutral.
//   - Click any step button to commit + freeze the cycle (matches
//     the canonical click-to-jump behavior).
//   - SSR posture: server renders step = 2 (`Verify` highlighted)
//     to match the canonical screenshot's resting visual; on
//     hydration the timer takes over from there.
//   - Skipped under `navigator.webdriver` (Playwright deterministic
//     E2E) AND `prefers-reduced-motion: reduce` — chain renders
//     with step = 2 frozen in those contexts.
//
// `<Standard>` chip styling (`.standard-chip`) lives globally in
// `public/assets/theme.css` — this island reuses the same class.

import { useEffect, useState } from "react";
import { PARTIES, STEPS, type LabelNode } from "../data/bridge.js";
import { lookupGlossary } from "../data/glossary.js";
import "./BridgeFlow.css";

const CYCLE_MS = 2200;
const SSR_DEFAULT_STEP = 2;

function shouldSkipAutoCycle(): boolean {
  if (typeof window === "undefined") return true;
  if (navigator.webdriver) return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

function StandardChip({ term }: { term: string }) {
  const def = lookupGlossary(term);
  if (!def) {
    return <span className="standard-chip standard-chip--missing">{term}</span>;
  }
  return (
    <a
      href={def.href}
      target={def.external ? "_blank" : undefined}
      rel={def.external ? "noopener noreferrer" : undefined}
      title={def.name}
      className="standard-chip"
    >
      {term}
    </a>
  );
}

function Tokenized({ nodes }: { nodes: readonly LabelNode[] }) {
  return (
    <>
      {nodes.map((node, i) =>
        node.kind === "term" ? (
          <StandardChip key={i} term={node.value} />
        ) : (
          <span key={i}>{node.value}</span>
        ),
      )}
    </>
  );
}

export default function BridgeFlow() {
  const [step, setStep] = useState<number>(SSR_DEFAULT_STEP);

  // USMR Phase 5.5.5 — dropped the `userInteractedRef` freeze. Canonical
  // Bridge.jsx:16-19 keeps cycling after click (the timer never clears).
  // Click on a step now resets step but doesn't stop the cycle; the
  // animation continues from the user-clicked step. Skipped under
  // prefers-reduced-motion AND navigator.webdriver.
  useEffect(() => {
    if (shouldSkipAutoCycle()) return;
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  const activeStep = STEPS[step] ?? STEPS[SSR_DEFAULT_STEP];
  const activeNodeId = activeStep.nodeId;

  return (
    <section
      className="bridge-flow"
      aria-labelledby="bridge-flow-heading"
      id="bridge-flow"
    >
      <div className="bridge-flow__head">
        <div>
          <p className="bridge-flow__eyebrow">The bridge strategy</p>
          <h2 id="bridge-flow-heading" className="bridge-flow__title display">
            Your legacy <StandardChip term="OIDC" /> app,
            <br />
            now{" "}
            <span className="bridge-flow__title-emphasis">
              cryptographically verified.
            </span>
          </h2>
        </div>
        <p className="bridge-flow__lede lead">
          Verifiable Credentials don't require a rewrite. Artagon's{" "}
          <StandardChip term="OID4VP" />→<StandardChip term="OIDC" /> bridge
          lets any existing <StandardChip term="OIDC" /> app consume claims from
          a user's wallet — without ever knowing <StandardChip term="VCs" />{" "}
          were involved.
        </p>
      </div>

      <div className="bridge-flow__board">
        <div className="bridge-flow__parties" role="presentation">
          {PARTIES.map((party) => {
            const isActive = party.id === activeNodeId;
            return (
              <div
                key={party.id}
                className={`bridge-party${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "step" : undefined}
              >
                <div className="bridge-party__role">{party.role}</div>
                <div className="bridge-party__label">
                  <Tokenized nodes={party.label} />
                </div>
                <div className="bridge-party__sub">
                  <Tokenized nodes={party.sub} />
                </div>
              </div>
            );
          })}
        </div>

        <ol className="bridge-flow__steps" aria-label="Bridge protocol steps">
          {STEPS.map((s, i) => {
            const isActive = i === step;
            const isPast = i < step;
            return (
              <li key={s.num} className="bridge-flow__step-wrap">
                <button
                  type="button"
                  className={`bridge-step${
                    isActive ? " is-active" : isPast ? " is-past" : ""
                  }`}
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => setStep(i)}
                >
                  <span className="bridge-step__num">STEP 0{s.num}</span>
                  <span className="bridge-step__title">{s.title}</span>
                  <span className="bridge-step__desc">
                    <Tokenized nodes={s.desc} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="bridge-flow__result">
        Result:{" "}
        <span className="bridge-flow__result-accent">
          high-assurance identity
        </span>{" "}
        flows through your existing stack. No migration. No rip-and-replace.
      </p>
    </section>
  );
}
