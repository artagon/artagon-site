/**
 * Tweaks panel — React island faithful to upstream
 * `new-design/extracted/src/layouts/BaseLayout.jsx:312-359`.
 *
 * Mounts only in dev (gated by `import.meta.env.DEV` in `Tweaks.astro`).
 * State is persisted to localStorage and projected onto `data-*` attributes
 * on `<html>` plus `.no-grid` on `<body>` — the same DOM contract upstream
 * CSS keys off. Pure parse/persist logic lives in `tweaks-state.ts` and is
 * shared with the node:test suite.
 *
 * Toggle: `⌘.` (or `Ctrl+.` on non-mac), `Esc` to close, or click the
 * trigger button.
 */

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ACCENT_SWATCH,
  ACCENTS,
  DEFAULTS,
  DENSITIES,
  HERO_FONTS,
  STORAGE_KEY,
  THEMES,
  parse,
  type Tweaks,
} from "../scripts/tweaks-state.ts";

function loadInitial(): Tweaks {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return parse(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS };
  }
}

function applyToDom(t: Tweaks): void {
  const html = document.documentElement;
  html.setAttribute("data-accent", t.accent);
  html.setAttribute("data-density", t.density);
  html.setAttribute("data-theme", t.theme);
  html.setAttribute("data-hero-font", t.heroFont);
  document.body.classList.toggle("no-grid", !t.showGrid);
}

function persist(t: Tweaks): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {
    /* ignore quota / security errors */
  }
}

export default function TweaksPanel(): React.JSX.Element {
  const [tweaks, setTweaks] = useState<Tweaks>(loadInitial);
  const [open, setOpen] = useState(false);

  // Apply + persist whenever state changes.
  useEffect(() => {
    applyToDom(tweaks);
    persist(tweaks);
  }, [tweaks]);

  // Keyboard: Esc closes; ⌘. / Ctrl+. toggles.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && open) setOpen(false);
      if (e.key === "." && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const setTweak = useCallback(
    <K extends keyof Tweaks>(key: K, value: Tweaks[K]): void => {
      setTweaks((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <>
      <button
        type="button"
        className="tweaks-trigger"
        aria-expanded={open}
        aria-controls="tweaks-panel"
        title="Tweaks (⌘. / Ctrl+.)"
        onClick={() => setOpen((prev) => !prev)}
      >
        ⚙ tweaks
      </button>
      <div
        id="tweaks-panel"
        className="tweaks-panel"
        role="dialog"
        aria-label="Design tweaks"
        hidden={!open}
      >
        <header className="tweaks-header">
          <h4>Tweaks</h4>
          <kbd>Esc</kbd>
        </header>

        <Field label="Accent">
          {ACCENTS.map((a) => (
            <Opt
              key={a}
              active={tweaks.accent === a}
              onClick={() => setTweak("accent", a)}
            >
              <span
                className="tweaks-swatch"
                style={{ background: ACCENT_SWATCH[a] }}
              />
              {a}
            </Opt>
          ))}
        </Field>

        <Field label="Density">
          {DENSITIES.map((d) => (
            <Opt
              key={d}
              active={tweaks.density === d}
              onClick={() => setTweak("density", d)}
            >
              {d}
            </Opt>
          ))}
        </Field>

        <Field label="Theme">
          {THEMES.map((t) => (
            <Opt
              key={t}
              active={tweaks.theme === t}
              onClick={() => setTweak("theme", t)}
            >
              {t}
            </Opt>
          ))}
        </Field>

        <Field label="Display font">
          {HERO_FONTS.map((f) => (
            <Opt
              key={f}
              active={tweaks.heroFont === f}
              onClick={() => setTweak("heroFont", f)}
            >
              {f}
            </Opt>
          ))}
        </Field>

        <Field label="Background grid">
          <Opt
            active={!tweaks.showGrid}
            onClick={() => setTweak("showGrid", false)}
          >
            off
          </Opt>
          <Opt
            active={tweaks.showGrid}
            onClick={() => setTweak("showGrid", true)}
          >
            on
          </Opt>
        </Field>

        <footer className="tweaks-footer">
          Dev only. Changes persist in localStorage.
        </footer>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <fieldset className="tweaks-field">
      <legend>{label}</legend>
      <div className="tweaks-opts" role="radiogroup" aria-label={label}>
        {children}
      </div>
    </fieldset>
  );
}

function Opt({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={active ? "tweaks-opt is-active" : "tweaks-opt"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
