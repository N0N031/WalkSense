/**
 * WalkSense color system.
 * Brand source: Vert profond #1A3A1A, Or premium #D4AF37,
 * Vert clair #3DBD3D, Noir profond #0F0F0F.
 */

export const COLORS = {
  primary: "#3DBD3D",
  accent: "#D4AF37",
  error: "#C0392B",
  cardBackground: "#121A10",

  verdProfond: "#1A3A1A",
  orPremium: "#D4AF37",
  vertClair: "#3DBD3D",
  noirProfond: "#0F0F0F",

  background: "#0F0F0F",
  surface: "#151E13",
  surfaceRaised: "#1A2616",
  text: "#F5F1E6",
  textSecondary: "#C8C6B8",
  textTertiary: "#8F927F",
  border: "#293621",
  divider: "#22301C",

  success: "#3DBD3D",
  danger: "#C0392B",
  warning: "#D4AF37",
  info: "#65B8FF",

  markerAuto: "#D4AF37",
  markerManual: "#3DBD3D",
  markerFind: "#C0392B",

  modePrivate: "#1A3A1A",
  modeBlurred: "#6B8E7F",
  modeGroup: "#3DBD3D",
  modeGhost: "#8F927F",

  gradientLight: "#1A3A1A",
  gradientDark: "#0F0F0F",
  gpsTrace: "#D4AF37",
  mapWater: "#162118",
  mapBuilding: "#1E2A1A",
};

export const COLOR_ALIASES = {
  primary: COLORS.primary,
  accent: COLORS.orPremium,
  success: COLORS.vertClair,
  error: COLORS.danger,
  disabled: COLORS.textTertiary,
};

export const ALPHA = {
  light: 0.1,
  medium: 0.3,
  strong: 0.6,
  opaque: 1,
};
