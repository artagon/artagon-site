// USMR Phase 5.1d (stage 3 — react). Interactive trust-chain island for
// the home hero. Hydrates on visibility (`client:visible` in index.astro).
//
// Behaviour:
//   - Scenario picker: 6 dot buttons cycle SCENARIOS[0..5]. Click changes
//     which chain + decision is rendered.
//   - Hover-to-claim: hovering a stage row swaps the decision card to
//     show that stage's pass/fail claim string + sub-line.
//
// SSR posture: the default render is `scenarioIdx=0` / `hovered=null`,
// which matches the static stage 2 output exactly. Hydration is
// scenario-only — there is no stage-by-stage animation timer, so no SSR
// flash. A future commit can layer an animated reveal under a flag if
// needed.

import { useState } from "react";
import {
  SCENARIOS,
  STAGES,
  type StageOutcome,
} from "../data/trust-chain.js";
import "./TrustChainIsland.css";

/**
 * Exhaustive-by-construction status label for a stage. The default arm
 * narrows `outcome` to `never`, so adding a new `StageOutcome` member
 * fails compilation here instead of silently rendering an empty span.
 */
function stageStatusLabel(outcome: StageOutcome): string {
  switch (outcome) {
    case "pass":
      return "✓ verified";
    case "fail":
      return "✕ blocked";
    case "skip":
      return "— skipped";
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

export default function TrustChainIsland() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  // Defensive fallback: if a future refactor wires `scenarioIdx` from URL
  // state / localStorage / props and an out-of-range value lands, render
  // the healthy default scenario rather than blanking the hero. The
  // console.error surfaces the actual bug so we don't silently degrade.
  const scenario = SCENARIOS[scenarioIdx] ?? SCENARIOS[0]!;
  if (scenarioIdx < 0 || scenarioIdx >= SCENARIOS.length) {
    console.error(
      `[TrustChainIsland] scenarioIdx ${scenarioIdx} out of range [0, ${SCENARIOS.length}); falling back to scenario 0.`,
    );
  }

  const decisionClass = scenario.decision.toLowerCase();
  const hoveredStage = hovered != null ? STAGES[hovered] : null;
  const hoveredOutcome = hovered != null ? scenario.stages[hovered] : null;

  const headLabel = hoveredStage
    ? hoveredStage.label
    : `Decision · ${scenario.decision}`;
  const claimLine = hoveredStage
    ? hoveredOutcome === "fail"
      ? hoveredStage.fail
      : hoveredStage.pass
    : scenario.finalClaim;
  const reasonLine = hoveredStage
    ? `// ${hoveredStage.sub}`
    : `// ${scenario.reason}`;

  return (
    <aside className="trust-chain" aria-labelledby="trust-chain-title">
      <header className="trust-chain__head">
        <span id="trust-chain-title">Compounding trust chain</span>
        <div className="trust-chain__scenarios" role="tablist">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === scenarioIdx}
              aria-label={s.label}
              title={s.label}
              className={`trust-chain__scenario-dot is-${s.decision.toLowerCase()}${
                i === scenarioIdx ? " is-active" : ""
              }`}
              onClick={() => setScenarioIdx(i)}
            />
          ))}
        </div>
      </header>

      <div className="trust-chain__scenario">
        <span className="trust-chain__scenario-label">{scenario.label}</span>
        <span className="trust-chain__scenario-context">
          {scenario.context}
        </span>
      </div>

      <ol className="trust-chain__stages" role="list">
        {STAGES.map((stage, i) => {
          const outcome = scenario.stages[i];
          return (
            <li
              key={stage.id}
              id={`trust-chain-${stage.id}`}
              className={`trust-chain__stage is-${outcome}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              role="button"
              aria-describedby="trust-chain-decision"
              aria-label={`${stage.label} — ${
                outcome === "pass"
                  ? "verified"
                  : outcome === "fail"
                    ? "blocked"
                    : "skipped"
              }`}
            >
              <span className="trust-chain__stage-num" aria-hidden="true">
                0{i + 1}
              </span>
              <div className="trust-chain__stage-body">
                <span className="trust-chain__stage-label">{stage.label}</span>
                <span className="trust-chain__stage-sub">{stage.sub}</span>
              </div>
              <span className="trust-chain__stage-status">
                {stageStatusLabel(outcome)}
              </span>
            </li>
          );
        })}
      </ol>

      <div
        id="trust-chain-decision"
        className={`trust-chain__decision is-${decisionClass}`}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="trust-chain__decision-head">
          <span>{headLabel}</span>
          <span className="trust-chain__decision-pep" aria-hidden="true">
            → PEP
          </span>
        </div>
        <div className="trust-chain__decision-claim">{claimLine}</div>
        <div className="trust-chain__decision-reason">{reasonLine}</div>
      </div>
    </aside>
  );
}
