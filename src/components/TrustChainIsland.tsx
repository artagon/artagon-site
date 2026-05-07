// USMR Phase 5.1d (stage 3 — react). Interactive trust-chain island for
// the home hero. Hydrates on visibility (`client:visible` in index.astro).
//
// Behaviour:
//   - Scenario picker: 6 dot buttons cycle SCENARIOS[0..5]. Click and
//     keyboard nav (ArrowLeft/Right/Home/End, Phase 5.1q.6) change which
//     chain + decision is rendered.
//   - Hover-to-claim: hovering or focusing a stage row swaps the decision
//     card to show that stage's pass/fail claim string + sub-line.
//   - Auto-progression (Phase 5.1d-idle): on first paint, the chain
//     advances stage-by-stage on a timer. Each stage's evaluating moment
//     shows a pulse on the number circle and a `chain-spinner` next to
//     "checking…". Halts on a fail outcome (subsequent stages stay
//     "skip"). Pauses while the user hovers/focuses any stage row OR a
//     scenario dot. Resets when the active scenario changes.
//
// SSR posture: SSR renders the fully-resolved scenario state (step =
// STAGES.length). Hydration triggers a useEffect that resets step to 0
// and walks it forward on a timer. Under `prefers-reduced-motion: reduce`
// the timer is disabled and the rendered state stays at fully-resolved
// (no flash, no animation).

import { useEffect, useMemo, useRef, useState } from "react";
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

// Auto-progression timing. Match new-design index.html:851-891.
const KICKOFF_MS = 400;
const FIRST_STAGE_MS = 1100;
const PER_STAGE_MS = 900;

function shouldSkipAutoProgression(): boolean {
  if (typeof window === "undefined") return true;
  // Playwright / automation sets `navigator.webdriver = true` —
  // auto-progression races deterministic E2E assertions that grab
  // decision-claim text immediately after networkidle. Real users
  // still get the chain-thinking animation.
  if ((navigator as { webdriver?: boolean }).webdriver) return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

export default function TrustChainIsland() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  // pressedIdx mirrors the hover affordance for touch users
  // (enhance-a11y-coverage Phase 1). Tapping a stage row toggles
  // pressed state; same idx → null, different idx → that idx.
  // Decision-claim resolution priority: pressed > hovered > scenario
  // finalClaim. `aria-pressed` reflects whether `pressedIdx === i`.
  const [pressedIdx, setPressedIdx] = useState<number | null>(null);
  // step = number of stages currently evaluating-or-settled. step=0 →
  // all stages pending; step=1 → stage 0 evaluating; step=2 → stage 0
  // settled, stage 1 evaluating; etc. SSR default = STAGES.length so
  // pre-hydration HTML matches the fully-resolved view (no FOUC).
  const [step, setStep] = useState<number>(STAGES.length);
  // Pause flag toggles when a user hovers/focuses anything inside the
  // chain OR clicks a scenario dot. The timer effect respects it.
  const [paused, setPaused] = useState(false);
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

  // First-mount auto-progression. Walks step from 0 up to STAGES.length
  // on a timer chain so the chain visually "evaluates" each stage on
  // first paint. Subsequent scenario changes (click / keyboard nav)
  // settle immediately to STAGES.length — users who actively pick a
  // scenario want the result, not a re-animation. Skipped under
  // prefers-reduced-motion.
  const animatedOnceRef = useRef(false);
  useEffect(() => {
    if (animatedOnceRef.current) {
      // Subsequent scenario change: jump to settled. The `paused` flag
      // (hover/focus) doesn't apply once we're past the first run —
      // the chain isn't animating any more.
      setStep(STAGES.length);
      return;
    }
    animatedOnceRef.current = true;
    if (shouldSkipAutoProgression()) {
      setStep(STAGES.length);
      return;
    }
    setStep(0);
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const advance = (next: number) => {
      if (cancelled || paused) return;
      setStep(next);
      if (next >= STAGES.length) return;
      const prevOutcome = scenario.stages[next - 1];
      // Halt on first fail — downstream stages stay `skip` per the
      // data contract; the spinner shouldn't re-appear past halt.
      if (prevOutcome === "fail") return;
      const delay = next === 0 ? FIRST_STAGE_MS : PER_STAGE_MS;
      timeout = setTimeout(() => advance(next + 1), delay);
    };
    timeout = setTimeout(() => advance(0), KICKOFF_MS);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
    // Intentionally only depends on scenarioIdx — the effect re-runs
    // on scenario change to settle, but the animation itself only
    // plays on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioIdx]);

  // Halt index for the *displayed* state — once a stage fails, no
  // subsequent stage should advertise "evaluating".
  const haltIdx = useMemo(() => {
    const i = scenario.stages.findIndex((s) => s === "fail");
    return i === -1 ? null : i;
  }, [scenario]);

  // Per-stage display state, computed from step + halt + outcome.
  function stageState(i: number): {
    outcome: StageOutcome | "pending" | "evaluating";
    showSpinner: boolean;
  } {
    const outcome = scenario.stages[i] ?? "skip";
    if (haltIdx !== null && i > haltIdx) {
      return { outcome: "skip", showSpinner: false };
    }
    if (step >= STAGES.length) {
      return { outcome, showSpinner: false };
    }
    if (i < step - 1) {
      return { outcome, showSpinner: false };
    }
    if (i === step - 1) {
      return { outcome: "evaluating", showSpinner: true };
    }
    return { outcome: "pending", showSpinner: false };
  }

  function stageClass(state: ReturnType<typeof stageState>): string {
    switch (state.outcome) {
      case "pass":
      case "fail":
      case "skip":
        return `is-${state.outcome}`;
      case "evaluating":
        return "is-evaluating";
      case "pending":
        return "is-pending";
    }
  }

  function stageDisplayLabel(state: ReturnType<typeof stageState>): string {
    switch (state.outcome) {
      case "evaluating":
        return "checking…";
      case "pending":
        return "—";
      default:
        return stageStatusLabel(state.outcome);
    }
  }

  const decisionClass = scenario.decision.toLowerCase();
  // Pressed (touch) state takes precedence over hovered (mouse). The
  // aria-pressed attribute on each stage row reflects whether THIS
  // particular stage is pressed; hover-only users still get the
  // hovered-driven decision-claim swap unchanged.
  const focusedIdx = pressedIdx ?? hovered;
  const hoveredStage = focusedIdx != null ? STAGES[focusedIdx] : null;
  const hoveredOutcome =
    focusedIdx != null ? scenario.stages[focusedIdx] : null;
  // Decision card body — once auto-progression completes (or under
  // reduced motion) we render the scenario's finalClaim; while still
  // evaluating, the card shows a generic "evaluating" placeholder so
  // users don't see the final result before the chain finishes.
  const isEvaluating = step < STAGES.length && haltIdx === null;
  const headLabel = hoveredStage
    ? hoveredStage.label
    : isEvaluating
      ? "Decision · pending"
      : `Decision · ${scenario.decision}`;
  const claimLine = hoveredStage
    ? hoveredOutcome === "fail"
      ? hoveredStage.fail
      : hoveredStage.pass
    : isEvaluating
      ? "evaluating chain…"
      : scenario.finalClaim;
  const reasonLine = hoveredStage
    ? `// ${hoveredStage.sub}`
    : isEvaluating
      ? `// ${step}/${STAGES.length} stages evaluated`
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
              onClick={() => {
                setScenarioIdx(i);
                setPaused(false);
              }}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              onKeyDown={(event) => {
                // WAI-ARIA tablist keyboard pattern (USMR Phase 5.1q.6).
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
          const state = stageState(i);
          const cls = stageClass(state);
          return (
            <li key={stage.id} className="trust-chain__stage-wrap">
              <button
                type="button"
                id={`trust-chain-${stage.id}`}
                className={`trust-chain__stage ${cls}${
                  pressedIdx === i ? " is-pressed" : ""
                }`}
                aria-pressed={pressedIdx === i}
                onClick={() => {
                  // enhance-a11y-coverage Phase 1 — touch tap-toggle.
                  // Same idx → release; different idx → press that idx.
                  setPressedIdx((current) => (current === i ? null : i));
                  setPaused(true);
                }}
                onMouseEnter={() => {
                  setHovered(i);
                  setPaused(true);
                }}
                onMouseLeave={() => {
                  setHovered(null);
                  setPaused(false);
                }}
                onFocus={() => {
                  setHovered(i);
                  setPaused(true);
                }}
                onBlur={() => {
                  setHovered(null);
                  setPaused(false);
                }}
                aria-describedby="trust-chain-decision"
                aria-label={`${stage.label} — ${
                  state.outcome === "pass"
                    ? "verified"
                    : state.outcome === "fail"
                      ? "blocked"
                      : state.outcome === "skip"
                        ? "skipped"
                        : state.outcome === "evaluating"
                          ? "checking"
                          : "pending"
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
                  {state.showSpinner ? (
                    <>
                      <span className="chain-spinner" aria-hidden="true" />{" "}
                    </>
                  ) : null}
                  {stageDisplayLabel(state)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        id="trust-chain-decision"
        className={`trust-chain__decision is-${decisionClass}${
          isEvaluating ? " is-pending" : ""
        }`}
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
