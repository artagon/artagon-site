// USMR 14.91: sRGB equivalents of the theme.css canvas tokens.
export const THEME_COLORS = {
  twilight: "#07090c",
  midnight: "#000808",
} as const;

export type CanvasTheme = keyof typeof THEME_COLORS;
