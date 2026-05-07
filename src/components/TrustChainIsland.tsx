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

import { useRef, useState } from "react";
import { SCENARIOS, STAGES, type StageOutcome } from "../data/trust-chain.js";
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
  // Anchored ref for the scenario tablist — the keyboard handler walks
  // siblings via this ref instead of `event.currentTarget.parentElement`
  // so a future wrapper insertion doesn't silently break focus.
  const tablistRef = useRef<HTMLDivElement>(null);

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
        <div
          ref={tablistRef}
          className="trust-chain__scenarios"
          role="tablist"
          aria-label="Trust-chain scenarios"
        >
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === scenarioIdx}
              aria-controls="trust-chain-decision"
              tabIndex={i === scenarioIdx ? 0 : -1}
              aria-label={s.label}
              title={s.label}
              data-scenario-idx={i}
              className={`trust-chain__scenario-dot is-${s.decision.toLowerCase()}${
                i === scenarioIdx ? " is-active" : ""
              }`}
              onClick={() => setScenarioIdx(i)}
              onKeyDown={(event) => {
                // WAI-ARIA tablist keyboard pattern (USMR Phase 5.1q.6).
                // ArrowLeft/Right walk between dots; Home/End jump to the
                // ends. The roving tabIndex above keeps Tab order clean —
                // only the active dot is in the document tab order.
                let next: number | null = null;
                if (event.key === "ArrowLeft") {
                  next = (i - 1 + SCENARIOS.length) % SCENARIOS.length;
                } else if (event.key === "ArrowRight") {
                  next = (i + 1) % SCENARIOS.length;
                } else if (event.key === "Home") {
                  next = 0;
                } else if (event.key === "End") {
                  next = SCENARIOS.length - 1;
                }
                if (next !== null) {
                  event.preventDefault();
                  setScenarioIdx(next);
                  const target =
                    tablistRef.current?.querySelector<HTMLButtonElement>(
                      `[data-scenario-idx="${next}"]`,
                    );
                  if (!target) {
                    // Surface the missing-ref bug rather than silently
                    // diverging keyboard state from visual focus.
                    console.error(
                      `[TrustChainIsland] tablist ref missing on key nav (next=${next})`,
                    );
                    return;
                  }
                  target.focus();
                }
              }}
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

      <ol className="trust-chain__stages">
        {STAGES.map((stage, i) => {
          // The data contract pins `scenario.stages` as a 5-tuple aligned
          // with STAGES (see src/data/trust-chain.ts); the runtime guard
          // is structural — we iterate STAGES, so `i` is always in range.
          const outcome = scenario.stages[i] ?? "skip";
          return (
            <li key={stage.id} className="trust-chain__stage-wrap">
              <button
                type="button"
                id={`trust-chain-${stage.id}`}
                className={`trust-chain__stage is-${outcome}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
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
                  <span className="trust-chain__stage-label">
                    {stage.label}
                  </span>
                  <span className="trust-chain__stage-sub">{stage.sub}</span>
                </div>
                <span className="trust-chain__stage-status">
                  {stageStatusLabel(outcome)}
                </span>
              </button>
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
