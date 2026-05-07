// USMR Phase 5.2.4 — /platform pillar tablist (React island, hydrated
// via `client:visible`). Ports the new-design Pillars composition
// (new-design/extracted/src/components/Pillars.jsx) to a token-only
// implementation aligned with the project's a11y + interaction
// contracts.
//
// WAI-ARIA tablist pattern, MANUAL activation (resolved Open question 2):
//   - ArrowLeft / ArrowRight walk focus between tabs (no commit).
//   - Home / End jump focus to first / last (no commit).
//   - Enter / Space commits the focused tab (panel swap fires).
//   - Click commits immediately (mouse path).
//   - Roving tabIndex — only the active tab is in document tab order.
//
// SSR posture: server renders `selectedIdx = 0` (Identity panel). On
// hydration the React state initializer matches, so no FOUC. Under
// `navigator.webdriver` (Playwright) the auto-progression hooks
// from TrustChainIsland do NOT apply — there's no auto-cycle here.
//
// The `<Standard>` chip styling (`.standard-chip`) lives globally in
// `public/assets/theme.css` so this island and the Astro `<Standard>`
// component share one source of truth (5.2.1).

import { useRef, useState, type KeyboardEvent } from "react";
import {
  PILLARS,
  type Bullet,
  type Pillar,
  type Specimen as SpecimenT,
} from "../data/pillars.js";
import { lookupGlossary } from "../data/glossary.js";
import "./PillarsIsland.css";

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

function BulletLine({ bullet }: { bullet: Bullet }) {
  return (
    <span>
      {bullet.map((node, idx) =>
        node.kind === "term" ? (
          <StandardChip key={idx} term={node.value} />
        ) : (
          <span key={idx}>{node.value}</span>
        ),
      )}
    </span>
  );
}

function Specimen({ spec }: { spec: SpecimenT }) {
  return (
    <div className="pillar-specimen">
      <div className="pillar-specimen__head">
        <span>{spec.header}</span>
        <span className="pillar-specimen__live">● live</span>
      </div>
      <pre className="pillar-specimen__body">{spec.payload}</pre>
    </div>
  );
}

interface PillarTabProps {
  pillar: Pillar;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onFocus: () => void;
  onKey: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
}

function PillarTab({
  pillar,
  index,
  isSelected,
  isFocused,
  onSelect,
  onFocus,
  onKey,
}: PillarTabProps) {
  return (
    <button
      type="button"
      role="tab"
      id={`pillar-tab-${pillar.id}`}
      aria-selected={isSelected}
      aria-controls={`pillar-panel-${pillar.id}`}
      tabIndex={isFocused ? 0 : -1}
      data-pillar-idx={index}
      className={`pillar-tab${isSelected ? " is-selected" : ""}`}
      onClick={onSelect}
      onFocus={onFocus}
      onKeyDown={(event) => onKey(event, index)}
    >
      <span className="pillar-tab__num">
        {pillar.num} · {pillar.eyebrow.toUpperCase()}
      </span>
      <span className="pillar-tab__title">{pillar.title}</span>
    </button>
  );
}

export default function PillarsIsland() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  // focusedIdx tracks keyboard focus separately so manual activation
  // (resolved Open question 2) can move focus without committing.
  const [focusedIdx, setFocusedIdx] = useState(0);
  const tablistRef = useRef<HTMLDivElement>(null);

  const moveFocus = (next: number) => {
    setFocusedIdx(next);
    const target = tablistRef.current?.querySelector<HTMLButtonElement>(
      `[data-pillar-idx="${next}"]`,
    );
    if (!target) {
      console.error(
        `[PillarsIsland] tab ref missing on key nav (next=${next})`,
      );
      return;
    }
    target.focus();
  };

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next: number | null = null;
    if (event.key === "ArrowLeft") {
      next = (i - 1 + PILLARS.length) % PILLARS.length;
    } else if (event.key === "ArrowRight") {
      next = (i + 1) % PILLARS.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = PILLARS.length - 1;
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // Commit the currently focused tab. Browser default click
      // behavior fires on Enter for buttons too, but Space scrolls
      // the page if not preventDefault'd.
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
    <section className="pillars" aria-labelledby="pillars-heading" id="pillars">
      <div className="pillars__head">
        <div>
          <p className="pillars__eyebrow">Platform</p>
          <h2 id="pillars-heading" className="pillars__title display">
            Three pillars,
            <br />
            <span className="pillars__title-emphasis">one</span> coherent
            platform.
          </h2>
        </div>
        <p className="pillars__lede lead">
          Others force you to wire Okta to Trinsic to OPA. Artagon unifies
          authentication, verifiable credentials, and authorization under one
          runtime, one protocol surface, one audit trail.
        </p>
      </div>

      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Platform pillars"
        className="pillars__tabs"
      >
        {PILLARS.map((pillar, i) => (
          <PillarTab
            key={pillar.id}
            pillar={pillar}
            index={i}
            isSelected={i === selectedIdx}
            isFocused={i === focusedIdx}
            onSelect={() => handleSelect(i)}
            onFocus={() => setFocusedIdx(i)}
            onKey={handleKey}
          />
        ))}
      </div>

      {PILLARS.map((pillar, i) => (
        <div
          key={pillar.id}
          role="tabpanel"
          id={`pillar-panel-${pillar.id}`}
          aria-labelledby={`pillar-tab-${pillar.id}`}
          hidden={i !== selectedIdx}
          className="pillars__panel"
        >
          <div className="pillars__panel-prose">
            <div className="pillars__tagline serif">{pillar.tagline}</div>
            <p className="pillars__body">{pillar.body}</p>
            <ul className="pillars__bullets">
              {pillar.bullets.map((bullet, b) => (
                <li key={b} className="pillars__bullet">
                  <span className="pillars__bullet-arrow" aria-hidden="true">
                    →
                  </span>
                  <BulletLine bullet={bullet} />
                </li>
              ))}
            </ul>
          </div>
          <Specimen spec={pillar.specimen} />
        </div>
      ))}
    </section>
  );
}
