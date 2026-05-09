// USMR Phase 5.3 — /use-cases vertical tablist (React island,
// hydrated via `client:visible`). Ports the new-design UseCases.jsx
// composition (new-design/extracted/src/components/UseCases.jsx) to
// a token-only implementation aligned with the project's a11y +
// interaction contracts.
//
// WAI-ARIA tablist pattern, MANUAL activation (matches the
// PillarsIsland convention from 5.2.4):
//   - ArrowUp / ArrowDown walk focus between rail buttons.
//   - Home / End jump focus to first / last.
//   - Enter / Space commits the focused tab (panel swap fires).
//   - Click commits immediately (mouse path).
//   - Roving tabIndex — only the active tab is in document tab order.

import { useRef, useState, type KeyboardEvent } from "react";
import { USE_CASES, type UseCaseScenario } from "../data/use-cases.js";
import "./UseCasesIsland.css";

interface RailTabProps {
  scenario: UseCaseScenario;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onFocus: () => void;
  onKey: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
}

function RailTab({
  scenario,
  index,
  isSelected,
  isFocused,
  onSelect,
  onFocus,
  onKey,
}: RailTabProps) {
  return (
    <button
      type="button"
      role="tab"
      id={`use-case-tab-${scenario.id}`}
      aria-selected={isSelected}
      aria-controls={`use-case-panel-${scenario.id}`}
      tabIndex={isFocused ? 0 : -1}
      data-use-case-idx={index}
      className={`use-case-tab${isSelected ? " is-selected" : ""}`}
      onClick={onSelect}
      onFocus={onFocus}
      onKeyDown={(event) => onKey(event, index)}
    >
      <span className="use-case-tab__short">{scenario.short}</span>
      <span className="use-case-tab__label">{scenario.label}</span>
    </button>
  );
}

export default function UseCasesIsland() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const tablistRef = useRef<HTMLDivElement>(null);

  const moveFocus = (next: number) => {
    setFocusedIdx(next);
    const target = tablistRef.current?.querySelector<HTMLButtonElement>(
      `[data-use-case-idx="${next}"]`,
    );
    if (!target) {
      console.error(
        `[UseCasesIsland] tab ref missing on key nav (next=${next})`,
      );
      return;
    }
    target.focus();
  };

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number | null = null;
    if (event.key === "ArrowUp") {
      next = (i - 1 + USE_CASES.length) % USE_CASES.length;
    } else if (event.key === "ArrowDown") {
      next = (i + 1) % USE_CASES.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = USE_CASES.length - 1;
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedIdx(i);
      return;
    }
    if (next !== null) {
      event.preventDefault();
      moveFocus(next);
    }
  };

  const handleSelect = (i: number) => {
    setSelectedIdx(i);
    setFocusedIdx(i);
  };

  return (
    <section
      className="use-cases"
      aria-labelledby="use-cases-heading"
      id="use-cases-island"
    >
      <header className="use-cases__head">
        <p className="use-cases__eyebrow">What you can build</p>
        <h2 id="use-cases-heading" className="use-cases__title display">
          The hard identity problems
          <br />
          <span className="use-cases__title-emphasis">— solved cleanly.</span>
        </h2>
      </header>

      <div className="use-cases__board">
        <div
          ref={tablistRef}
          role="tablist"
          aria-orientation="vertical"
          aria-label="Use-case scenarios"
          className="use-cases__rail"
        >
          {USE_CASES.map((scenario, i) => (
            <RailTab
              key={scenario.id}
              scenario={scenario}
              index={i}
              isSelected={i === selectedIdx}
              isFocused={i === focusedIdx}
              onSelect={() => handleSelect(i)}
              onFocus={() => setFocusedIdx(i)}
              onKey={handleKey}
            />
          ))}
        </div>

        {USE_CASES.map((scenario, i) => (
          <div
            key={scenario.id}
            role="tabpanel"
            id={`use-case-panel-${scenario.id}`}
            aria-labelledby={`use-case-tab-${scenario.id}`}
            hidden={i !== selectedIdx}
            className="use-cases__panel"
          >
            <div className="use-cases__panel-head">
              <p className="use-cases__panel-eyebrow">
                Scenario · {scenario.short}
              </p>
              <h3 className="use-cases__panel-title">{scenario.title}</h3>
              <p className="use-cases__panel-body">{scenario.scenario}</p>
            </div>

            <div className="use-cases__metrics" role="list">
              {scenario.metrics.map((metric, m) => (
                <div key={m} className="use-cases__metric" role="listitem">
                  <p className="use-cases__metric-key">{metric.key}</p>
                  <p className="use-cases__metric-value">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="use-cases__trace">
              <p className="use-cases__trace-eyebrow">Protocol trace</p>
              <ol className="use-cases__trace-body">
                {scenario.trace.map((line, t) => {
                  const isDecision = t === scenario.trace.length - 1;
                  return (
                    <li
                      key={t}
                      className={`use-cases__trace-line${
                        isDecision ? " is-decision" : ""
                      }`}
                    >
                      <span className="use-cases__trace-num" aria-hidden="true">
                        {String(t + 1).padStart(2, "0")}
                      </span>
                      <span className="use-cases__trace-text">{line}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
