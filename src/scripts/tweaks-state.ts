/**
 * Tweaks state — pure parse + persist logic, no DOM or browser globals.
 * Imported by both `tweaks.ts` (browser) and node:test files (server).
 */

export type Accent = "cyan" | "violet" | "amber" | "lime";
export type Density = "dense" | "comfortable" | "roomy";
export type Theme = "dark" | "light";
export type HeroFont = "grotesk" | "fraunces" | "dmserif" | "mono";

export interface Tweaks {
  accent: Accent;
  density: Density;
  theme: Theme;
  heroFont: HeroFont;
  showGrid: boolean;
}

export const STORAGE_KEY = "artagon.tweaks.v1";

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
};

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
  };
}
