/**
 * Design tokens ported from docs/Colour.md, Typography.md, Spacing.md.
 * React Native has no CSS variables, so both themes are plain JS objects and
 * switching is done via ThemeContext (src/theme/ThemeContext.tsx), not classes.
 * If you change a value in the docs, mirror it here AND in web/tailwind.config.ts —
 * three places now need to stay in lockstep across the two independent codebases.
 */

export const darkColors = {
  bgBase: "#1C1815",
  bgSurface: "#241F1B",
  bgElevated: "#2E2822",
  borderSubtle: "#3A332C",
  textPrimary: "#F2E9DE",
  textSecondary: "#B8AC9C",
  accentPrimary: "#D98E5B",
  accentSecondary: "#8AA68A",
  accentPass: "#6E6259",
  accentDanger: "#CC6656", // matches the Phase 13 web contrast fix — keep in sync
  tokenGold: "#C9A24B",
  onAccent: "#2B1608",
};

export const lightColors = {
  bgBase: "#FBF6EF",
  bgSurface: "#F3ECE1",
  bgElevated: "#FFFFFF",
  borderSubtle: "#E3D8C8",
  textPrimary: "#2B241D",
  textSecondary: "#6E6259",
  accentPrimary: "#C97A45",
  accentSecondary: "#5F7D5F",
  accentPass: "#8C8171",
  accentDanger: "#A8402F",
  tokenGold: "#A9812E",
  onAccent: "#2B1608",
};

export type ThemeColors = typeof darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
};

export const typography = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};
