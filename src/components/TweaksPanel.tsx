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

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  ACCENT_SWATCH,
  ACCENTS,
  DEFAULTS,
  DENSITIES,
  HERO_FONTS,
  STORAGE_KEY,
  THEMES,
  WRITING_WIDGETS,
  parse,
  type Tweaks,
} from "../scripts/tweaks-state.ts";

// Expected DOMException classes when localStorage is blocked. Anything else
// is unexpected and surfaced to the dev-console — silent catch-all on every
// state change would mask future bugs (e.g. JSON.stringify on a circular
// value, polyfill throws in test contexts).
const EXPECTED_STORAGE_ERROR_NAMES = new Set([
  "QuotaExceededError",
  "SecurityError",
]);

function isExpectedStorageError(err: unknown): boolean {
  return (
    err instanceof DOMException && EXPECTED_STORAGE_ERROR_NAMES.has(err.name)
  );
}

function loadInitial(): Tweaks {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return parse(JSON.parse(raw));
  } catch (err) {
    // Dev-only panel: surface failures so a maintainer can tell
    // "JSON corrupted" from "storage blocked" from "parse() bug".
    if (!isExpectedStorageError(err)) {
      console.warn("[TweaksPanel] loadInitial fell back to DEFAULTS:", err);
    }
    return { ...DEFAULTS };
  }
}

function applyToDom(t: Tweaks): void {
  const html = document.documentElement;
  html.setAttribute("data-accent", t.accent);
  html.setAttribute("data-density", t.density);
  html.setAttribute("data-theme", t.theme);
  html.setAttribute("data-hero-font", t.heroFont);
  // pt108 + pt109 — writingWidget projected to data-writing-widget
  // on <html>; pt109 wired the per-variant rendering via :global()
  // selectors in src/pages/index.astro:740+ that toggle visibility
  // of `.writing-strip` and `.hero__latest-strip`. Setting the
  // attribute here drives the live layout (no longer no-op).
  html.setAttribute("data-writing-widget", t.writingWidget);
  document.body.classList.toggle("no-grid", !t.showGrid);
}

function persist(t: Tweaks): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch (err) {
    // Quota and SecurityError are expected on private-mode browsers and
    // when storage is blocked; everything else (TypeError from a circular
    // value, polyfill bug, etc.) is a real defect we want to see.
    if (!isExpectedStorageError(err)) {
      console.warn("[TweaksPanel] persist failed unexpectedly:", err);
    }
  }
}

export default function TweaksPanel() {
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

  const setTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]): void => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  };

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

        {/* USMR Phase 5.5.16-pt108 — added Writing widget section to
            match canonical Tweaks panel (per user's reference
            screenshot). Writes `data-writing-widget` on <html>; the
            layout-switching consumers shipped in pt109 (variant CSS
            in `src/pages/index.astro` lines 735+ targets `:global(
            [data-writing-widget="off"|"in-hero"|"A · strip"|"B ·
            3-up"|"C · split"|"D · ticker"])` and toggles
            visibility of `.writing-strip` / `.hero__latest-strip`).
            6 variant buttons here; default is `B · 3-up`. */}
        <Field label="Writing widget">
          {WRITING_WIDGETS.map((w) => (
            <Opt
              key={w}
              active={tweaks.writingWidget === w}
              onClick={() => setTweak("writingWidget", w)}
            >
              {w}
            </Opt>
          ))}
        </Field>

        <footer className="tweaks-footer">
          Dev only. Changes persist in localStorage.
        </footer>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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
  children: ReactNode;
}) {
  // USMR Phase 5.5.16-pt422 — blur the button after a pointer click so
  // Safari's `:focus-visible` heuristic doesn't leave a violet outline
  // on the previously-clicked button (Safari applies `:focus-visible`
  // on pointer clicks more aggressively than Chrome/Firefox; combined
  // with the global `button:focus-visible { outline: 2px solid
  // var(--accent) }` in theme.css, the residual outline on a
  // not-active button looks like a stuck selection — the bug the
  // user reported as "selection stays"). Keyboard users still get
  // visible focus because Tab/Arrow nav re-applies `:focus-visible`
  // before they release the key.
  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    onClick();
    e.currentTarget.blur();
  }
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={active ? "tweaks-opt is-active" : "tweaks-opt"}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
