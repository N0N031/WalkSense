/**
 * WalkSense color system.
 * Brand source: Vert profond #1A3A1A, Or premium #D4AF37,
 * Vert clair #3DBD3D, Noir profond #0F0F0F.
 */

export const COLORS = {
  primary: "#50E64E",
  accent: "#D4AF37",
  error: "#F24B4B",
  cardBackground: "rgba(5, 12, 7, 0.92)",

  verdProfond: "#07140A",
  orPremium: "#D4AF37",
  vertClair: "#50E64E",
  noirProfond: "#050505",

  background: "#050505",
  surface: "rgba(5, 12, 7, 0.86)",
  surfaceRaised: "rgba(5, 12, 7, 0.92)",
  text: "#F5F1E8",
  textSecondary: "#B8B8B8",
  textTertiary: "#8E9486",
  border: "rgba(80, 230, 78, 0.28)",
  divider: "rgba(212, 175, 55, 0.22)",

  success: "#50E64E",
  danger: "#F24B4B",
  warning: "#D4AF37",
  info: "#65B8FF",

  markerAuto: "#D4AF37",
  markerManual: "#3DBD3D",
  markerFind: "#C0392B",

  modePrivate: "#1A3A1A",
  modeBlurred: "#6B8E7F",
  modeGroup: "#3DBD3D",
  modeGhost: "#8F927F",

  gradientLight: "#07140A",
  gradientDark: "#050505",
  gpsTrace: "#D4AF37",
  mapWater: "#07170E",
  mapBuilding: "#0E2012",
  glowGreen: "#50E64E",
  glass: "rgba(4, 10, 6, 0.72)",
  glassStrong: "rgba(2, 7, 4, 0.92)",
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
