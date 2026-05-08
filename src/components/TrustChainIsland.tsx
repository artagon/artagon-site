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
// Auto-cycle: after a chain settles, wait this long, then advance to the
// next scenario and re-animate. Stops once a user clicks any scenario or
// stage (per `userInteractedRef`).
const CYCLE_DELAY_MS = 3400;

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

  // Auto-progression effect — animates the active scenario's chain
  // stage-by-stage on a setTimeout chain. Plays on every scenario
  // change. USMR Phase 5.5.5 — dropped the `userInteractedRef` freeze
  // pattern that previously latched-after-first-click, restoring the
  // canonical "always cycling" UX (Hero.jsx:116-121 — `setScenarioIdx`
  // never gates on a user-interacted ref). Click on a scenario dot
  // now resets the chain to that scenario and the animation
  // continues; the auto-cycle eventually advances past the
  // user-clicked scenario as well. Skipped under prefers-reduced-motion
  // AND under navigator.webdriver (Playwright deterministic E2E).
  useEffect(() => {
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
      // `next` just became the new step value — that means the stage
      // at index (next - 1) is currently rendering as "evaluating"
      // (per stageState's `i === step - 1` branch). Inspect its
      // ACTUAL outcome to decide what to schedule next.
      const evaluatingOutcome = scenario.stages[next - 1];
      if (evaluatingOutcome === "fail") {
        // The currently-evaluating stage is the failing stage. Hold
        // it on "checking…" for one more PER_STAGE_MS window so the
        // spinner reads, then JUMP to fully settled (step =
        // STAGES.length). Without the jump, step would stay mid-
        // chain, the auto-cycle effect (gated on step >=
        // STAGES.length) would never fire, and the chain would
        // freeze on "checking…" forever — the bug visible at PR #46
        // smoke screenshot for the `device_fail` scenario.
        timeout = setTimeout(() => {
          if (cancelled || paused) return;
          setStep(STAGES.length);
        }, PER_STAGE_MS);
        return;
      }
      const delay = next === 0 ? FIRST_STAGE_MS : PER_STAGE_MS;
      timeout = setTimeout(() => advance(next + 1), delay);
    };
    timeout = setTimeout(() => advance(0), KICKOFF_MS);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [scenarioIdx, paused, scenario]);

  // Auto-cycle effect — once a chain has settled (step >= STAGES.length),
  // wait CYCLE_DELAY_MS then advance scenarioIdx to the next scenario.
  // Pauses while hover/focus is active or under shouldSkipAutoProgression.
  // USMR 5.5.5 dropped the user-interacted latch — clicking a scenario
  // dot resets the chain but does not stop the cycle.
  useEffect(() => {
    if (shouldSkipAutoProgression()) return;
    if (paused) return;
    if (step < STAGES.length) return;
    const t = setTimeout(() => {
      setScenarioIdx((i) => (i + 1) % SCENARIOS.length);
    }, CYCLE_DELAY_MS);
    return () => clearTimeout(t);
  }, [step, scenarioIdx, paused]);

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
      ? // USMR 5.5.13 — canonical Hero.jsx:409 reads "Final claim"
        // while evaluating (forward-looking) instead of mine's earlier
        // "Decision · pending" (commits-to-pending tone).
        "Final claim"
      : `Decision · ${scenario.decision}`;
  const claimLine = hoveredStage
    ? hoveredOutcome === "fail"
      ? hoveredStage.fail
      : hoveredStage.pass
    : isEvaluating
      ? // USMR 5.5.11 Task #34 — canonical Hero.jsx:417 stage-aware claim.
        `evaluating stage ${String(Math.min(step + 1, STAGES.length)).padStart(2, "0")}/${String(STAGES.length).padStart(2, "0")}…`
      : scenario.finalClaim;
  const reasonLine = hoveredStage
    ? `// ${hoveredStage.sub}`
    : isEvaluating
      ? `// ${step}/${STAGES.length} stages evaluated`
      : `// ${scenario.reason}`;

  // USMR 5.5.11 Task #28 — dynamic card-shell glow + border per
  // canonical Hero.jsx:215-243. Glow intensity grows with passed
  // stages while evaluating; settled state flips to PERMIT-cyan or
  // DENY-red. transition is on the inline style so the shadow
  // animates as stages settle.
  const isDeny = scenario.decision === "DENY";
  const finalShown = step >= STAGES.length;
  const passedCount = scenario.stages
    .slice(0, Math.max(0, step))
    .filter((s) => s === "pass").length;
  const glowIntensity = Math.min(passedCount / STAGES.length, 1);
  const C_PASS = "var(--accent)";
  const C_FAIL = "var(--bad)";
  const C_FAIL_DIM = "color-mix(in oklab, var(--bad) 60%, var(--bg))";
  const cardShellStyle: React.CSSProperties = {
    boxShadow: finalShown
      ? isDeny
        ? `0 0 60px -20px ${C_FAIL}, inset 0 0 60px -30px ${C_FAIL}`
        : `0 0 80px -12px ${C_PASS}, inset 0 0 40px -20px ${C_PASS}`
      : `0 0 ${40 + glowIntensity * 60}px -20px ${C_PASS}`,
    borderColor: finalShown && isDeny ? C_FAIL_DIM : "var(--line)",
    transition: "box-shadow .6s ease, border-color .4s ease",
  };

  return (
    <aside
      className="trust-chain"
      aria-labelledby="trust-chain-title"
      style={cardShellStyle}
      data-decision-final={
        finalShown ? scenario.decision.toLowerCase() : "pending"
      }
    >
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
          // USMR Phase 5.5.11 Task #32 — emit a per-wrap flag so the
          // connector below this row can tint to accent only when THIS
          // stage settled to pass (canonical Hero.jsx:379-380).
          const settledPass = state.outcome === "pass";
          return (
            <li
              key={stage.id}
              className="trust-chain__stage-wrap"
              data-prev-pass={settledPass ? "true" : "false"}
            >
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
        // USMR Phase 5.5.12 — only emit `is-permit` / `is-deny` AFTER
        // the chain has settled (per canonical Hero.jsx:393,396,401-405,
        // 411,413). Pre-settle the decision card paints muted (var(--line-soft)
        // border, var(--bg) background, accent-tinted claim) — DENY scenarios
        // no longer "spoil" the verdict by glowing red before any stage
        // has actually failed.
        className={`trust-chain__decision${
          isEvaluating ? " is-pending" : ` is-${decisionClass}`
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
