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
import { SCENARIOS, STAGES } from "../data/trust-chain.js";
import "./TrustChainIsland.css";

export default function TrustChainIsland() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  const scenario = SCENARIOS[scenarioIdx];
  if (!scenario) return null;

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
            >
              <span className="trust-chain__stage-num" aria-hidden="true">
                0{i + 1}
              </span>
              <div className="trust-chain__stage-body">
                <span className="trust-chain__stage-label">{stage.label}</span>
                <span className="trust-chain__stage-sub">{stage.sub}</span>
              </div>
              <span className="trust-chain__stage-status">
                {outcome === "pass" && "✓ verified"}
                {outcome === "fail" && "✕ blocked"}
                {outcome === "skip" && "— skipped"}
              </span>
            </li>
          );
        })}
      </ol>

      <div className={`trust-chain__decision is-${decisionClass}`}>
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
