/**
 * Tweaks panel — dev-only design tinkerer.
 *
 * Reads/writes localStorage, projects state onto `data-*` attributes on `<html>`,
 * and toggles a `.no-grid` class on `<body>`. The CSS in `public/assets/theme.css`
 * (and per-page styles) consumes those attributes via `:root[data-theme="..."]`,
 * `:root[data-accent="..."]`, etc.
 *
 * Dev-only: this script is loaded behind `import.meta.env.DEV` in `Tweaks.astro`,
 * so it is tree-shaken out of the production bundle. No CSP/SRI exposure.
 *
 * Pure parse/apply logic lives in `tweaks-state.ts` (testable under node:test).
 * This file is the DOM/custom-element glue.
 */

import {
  ACCENT_SWATCH,
  ACCENTS,
  DEFAULTS,
  DENSITIES,
  HERO_FONTS,
  STORAGE_KEY,
  THEMES,
  isAccent,
  isDensity,
  isHeroFont,
  isTheme,
  parse,
  type Tweaks,
} from "./tweaks-state.ts";

/** Project state onto DOM. Inline (no separate module) to keep bundle small. */
function applyToDom(t: Tweaks): void {
  const html = document.documentElement;
  html.setAttribute("data-accent", t.accent);
  html.setAttribute("data-density", t.density);
  html.setAttribute("data-theme", t.theme);
  html.setAttribute("data-hero-font", t.heroFont);
  document.body.classList.toggle("no-grid", !t.showGrid);
}

function load(): Tweaks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return parse(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS };
  }
}

function save(t: Tweaks): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {
    /* ignore quota/security errors */
  }
}

class TweaksPanel extends HTMLElement {
  private state: Tweaks = { ...DEFAULTS };
  private open = false;
  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && this.open) this.toggle(false);
    // ⌘. on macOS, Ctrl+. on other platforms
    if (e.key === "." && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.toggle(!this.open);
    }
  };

  connectedCallback(): void {
    this.state = load();
    applyToDom(this.state);
    this.render();
    document.addEventListener("keydown", this.onKeyDown);
  }

  disconnectedCallback(): void {
    document.removeEventListener("keydown", this.onKeyDown);
  }

  private toggle(next?: boolean): void {
    this.open = typeof next === "boolean" ? next : !this.open;
    const panel = this.querySelector<HTMLElement>(".tweaks-panel");
    if (panel) panel.hidden = !this.open;
    const trigger = this.querySelector<HTMLButtonElement>(".tweaks-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", String(this.open));
  }

  private set<K extends keyof Tweaks>(key: K, value: Tweaks[K]): void {
    this.state = { ...this.state, [key]: value };
    save(this.state);
    applyToDom(this.state);
    this.render();
  }

  private render(): void {
    const t = this.state;
    const seg = (
      label: string,
      key: keyof Tweaks,
      options: ReadonlyArray<string | boolean>,
      labels?: ReadonlyArray<string>,
    ): string =>
      `<fieldset class="tweaks-field">
        <legend>${label}</legend>
        <div class="tweaks-opts" role="radiogroup" aria-label="${label}">
          ${options
            .map((opt, i) => {
              const active = String(t[key]) === String(opt);
              const display = labels?.[i] ?? String(opt);
              const swatch =
                key === "accent" && isAccent(String(opt))
                  ? `<span class="tweaks-swatch" style="background:${ACCENT_SWATCH[String(opt) as keyof typeof ACCENT_SWATCH]}"></span>`
                  : "";
              return `<button
                type="button"
                role="radio"
                aria-checked="${active}"
                data-key="${key}"
                data-value="${String(opt)}"
                class="tweaks-opt${active ? " is-active" : ""}"
              >${swatch}${display}</button>`;
            })
            .join("")}
        </div>
      </fieldset>`;

    const panelHidden = !this.open;
    this.innerHTML = `
      <button
        type="button"
        class="tweaks-trigger"
        aria-expanded="${this.open}"
        aria-controls="tweaks-panel"
        title="Tweaks (⌘. / Ctrl+.)"
      >⚙ tweaks</button>
      <div
        id="tweaks-panel"
        class="tweaks-panel"
        role="dialog"
        aria-label="Design tweaks"
        ${panelHidden ? "hidden" : ""}
      >
        <header class="tweaks-header">
          <h4>Tweaks</h4>
          <kbd>Esc</kbd>
        </header>
        ${seg("Accent", "accent", ACCENTS)}
        ${seg("Density", "density", DENSITIES)}
        ${seg("Theme", "theme", THEMES)}
        ${seg("Display font", "heroFont", HERO_FONTS)}
        ${seg("Background grid", "showGrid", [false, true], ["off", "on"])}
        <footer class="tweaks-footer">
          Dev only. Changes persist in localStorage.
        </footer>
      </div>
    `;

    this.querySelector(".tweaks-trigger")?.addEventListener("click", () =>
      this.toggle(),
    );
    this.querySelectorAll<HTMLButtonElement>(".tweaks-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.key as keyof Tweaks;
        const raw = btn.dataset.value;
        if (!key || raw === undefined) return;
        if (key === "showGrid") {
          this.set("showGrid", raw === "true");
        } else if (key === "accent" && isAccent(raw)) {
          this.set("accent", raw);
        } else if (key === "density" && isDensity(raw)) {
          this.set("density", raw);
        } else if (key === "theme" && isTheme(raw)) {
          this.set("theme", raw);
        } else if (key === "heroFont" && isHeroFont(raw)) {
          this.set("heroFont", raw);
        }
      });
    });
  }
}

if (!customElements.get("artagon-tweaks")) {
  customElements.define("artagon-tweaks", TweaksPanel);
}
