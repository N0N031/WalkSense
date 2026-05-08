/**
 * WalkSense color system.
 * Brand source: Vert profond #1A3A1A, Or premium #D4AF37,
 * Vert clair #3DBD3D, Noir profond #0F0F0F.
 */

export const COLORS = {
  primary: "#52E04F",
  accent: "#F3C84B",
  error: "#F24B4B",
  cardBackground: "rgba(4, 12, 7, 0.88)",

  verdProfond: "#1A3A1A",
  orPremium: "#F3C84B",
  vertClair: "#52E04F",
  noirProfond: "#020604",

  background: "#020604",
  surface: "rgba(5, 15, 9, 0.82)",
  surfaceRaised: "rgba(9, 25, 13, 0.92)",
  text: "#FFF7E6",
  textSecondary: "#CFC7B8",
  textTertiary: "#8E9486",
  border: "rgba(82, 224, 79, 0.28)",
  divider: "rgba(243, 200, 75, 0.22)",

  success: "#52E04F",
  danger: "#F24B4B",
  warning: "#F3C84B",
  info: "#65B8FF",

  markerAuto: "#D4AF37",
  markerManual: "#3DBD3D",
  markerFind: "#C0392B",

  modePrivate: "#1A3A1A",
  modeBlurred: "#6B8E7F",
  modeGroup: "#3DBD3D",
  modeGhost: "#8F927F",

  gradientLight: "#133E17",
  gradientDark: "#020604",
  gpsTrace: "#F3C84B",
  mapWater: "#07170E",
  mapBuilding: "#0E2012",
  glowGreen: "#89FF3F",
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
