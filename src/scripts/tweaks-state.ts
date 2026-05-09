/**
 * Tweaks state — pure parse + persist logic, no DOM or browser globals.
 * Imported by `src/components/TweaksPanel.tsx` (the dev-only React island)
 * and the node:test suite (`tests/tweaks-state.test.mts`,
 * `tests/tweaks-parse.test.mjs`).
 *
 * Vocabulary contract: this module mirrors the upstream new-design state
 * shape verbatim (`new-design/extracted/src/layouts/BaseLayout.jsx`).
 * The `Theme` keyword set is `dark`/`light` to match upstream. NOTE: the
 * live `public/assets/theme.css` currently keys off
 * `:root[data-theme="midnight|twilight"]` — those selectors are
 * the pre-USMR theme system. Until USMR ports the upstream
 * `dark`/`light` token sheets, selecting "Theme: dark" in the dev panel
 * writes a `data-theme` value that the live CSS does not match, leaving
 * the page in a tokens-only state. This is a documented mid-flight
 * vocabulary gap, not a bug to fix here. See
 * `openspec/changes/archive/2026-05-04-add-tweaks-panel/proposal.md`
 * Out-of-Scope §3 (the change archived 2026-05-04; the live path
 * for archaeology is the archive entry).
 */

export type Accent = "cyan" | "violet" | "amber" | "lime";
export type Density = "dense" | "comfortable" | "roomy";
export type Theme = "dark" | "light";
export type HeroFont = "grotesk" | "fraunces" | "dmserif" | "mono";

/** USMR Phase 5.5.16-pt108 + pt109 — Writing widget layout variants
 *  per canonical `new-design/extracted/explorations/writing-widget.
 *  jsx` (4 OPTION blocks A-D) + index.html:938 HeroLatestStrip
 *  (in-hero) + an "off" no-op variant. pt108 shipped the Tweaks
 *  panel control surface; pt109 wired the rendering switch via
 *  `:global([data-writing-widget="..."])` selectors in
 *  `src/pages/index.astro:735+` that toggle `.writing-strip` and
 *  `.hero__latest-strip` visibility per variant. */
export type WritingWidget =
  | "in-hero"
  | "A · strip"
  | "B · 3-up"
  | "C · split"
  | "D · ticker"
  | "off";

export interface Tweaks {
  accent: Accent;
  density: Density;
  theme: Theme;
  heroFont: HeroFont;
  showGrid: boolean;
  writingWidget: WritingWidget;
}

/** USMR Phase 5.5.16-pt88 — bumped "v1" → "v2" to invalidate stale
 *  localStorage state from earlier dev sessions. Pre-pt88 users had
 *  `artagon.tweaks.v1` with arbitrary saved state (often `accent:
 *  "amber"` from QA testing). The pre-paint restore script in
 *  Tweaks.astro applied that state, overriding the canonical
 *  `data-accent="cyan"` default in BaseLayout. The key bump ensures
 *  the canonical defaults apply on first load until the user
 *  explicitly toggles via the Tweaks panel. */
export const STORAGE_KEY = "artagon.tweaks.v3";

/** OKLCH swatch values for accent buttons (visual reference only — runtime CSS via data-accent). */
export const ACCENT_SWATCH: Record<Accent, string> = {
  cyan: "oklch(0.86 0.14 185)",
  violet: "oklch(0.78 0.16 300)",
  amber: "oklch(0.84 0.14 75)",
  lime: "oklch(0.88 0.18 135)",
};

export const DEFAULTS: Tweaks = {
  accent: "cyan",
  density: "comfortable",
  theme: "dark",
  heroFont: "grotesk",
  showGrid: true,
  writingWidget: "B · 3-up",
};

export const WRITING_WIDGETS: ReadonlyArray<WritingWidget> = [
  "in-hero",
  "A · strip",
  "B · 3-up",
  "C · split",
  "D · ticker",
  "off",
];

export function isWritingWidget(v: unknown): v is WritingWidget {
  return (
    typeof v === "string" &&
    (WRITING_WIDGETS as ReadonlyArray<string>).includes(v)
  );
}

export const ACCENTS: ReadonlyArray<Accent> = [
  "cyan",
  "violet",
  "amber",
  "lime",
];
export const DENSITIES: ReadonlyArray<Density> = [
  "dense",
  "comfortable",
  "roomy",
];
export const THEMES: ReadonlyArray<Theme> = ["dark", "light"];
export const HERO_FONTS: ReadonlyArray<HeroFont> = [
  "grotesk",
  "fraunces",
  "dmserif",
  "mono",
];

export function isAccent(v: unknown): v is Accent {
  return (
    typeof v === "string" && (ACCENTS as ReadonlyArray<string>).includes(v)
  );
}
export function isDensity(v: unknown): v is Density {
  return (
    typeof v === "string" && (DENSITIES as ReadonlyArray<string>).includes(v)
  );
}
export function isTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as ReadonlyArray<string>).includes(v);
}
export function isHeroFont(v: unknown): v is HeroFont {
  return (
    typeof v === "string" && (HERO_FONTS as ReadonlyArray<string>).includes(v)
  );
}

/** Parse an unknown value into a valid Tweaks, falling back per-field to DEFAULTS. */
export function parse(raw: unknown): Tweaks {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULTS };
  const r = raw as Record<string, unknown>;
  return {
    accent: isAccent(r.accent) ? r.accent : DEFAULTS.accent,
    density: isDensity(r.density) ? r.density : DEFAULTS.density,
    theme: isTheme(r.theme) ? r.theme : DEFAULTS.theme,
    heroFont: isHeroFont(r.heroFont) ? r.heroFont : DEFAULTS.heroFont,
    showGrid: typeof r.showGrid === "boolean" ? r.showGrid : DEFAULTS.showGrid,
    writingWidget: isWritingWidget(r.writingWidget)
      ? r.writingWidget
      : DEFAULTS.writingWidget,
  };
}
