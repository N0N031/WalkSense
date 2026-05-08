/**
 * WalkSense branding constants.
 */

export const BRANDING = {
  name: "WalkSense",
  tagline: "Tracking & Exploration de Terrain",
  description: "Prospection assistee par GPS et detecteur de metaux",
  version: "1.0.0",

  logo: {
    primary: "#D4AF37",
    secondary: "#1A3A1A",
    accent: "#3DBD3D",
    background: "#0F0F0F",
  },

  assets: {
    logoBoard: "assets/images/walksense-logo-board.png",
    logoPrimary: "assets/images/walksense-logo.png",
    logoMark: "assets/images/walksense-mark-source-transparent.png",
    appIcon: "assets/images/walksense-icon.png",
  },

  copy: {
    sessionNew: "Nouvelle session",
    sessionRunning: "Session en cours",
    sessionPaused: "Session en pause",
    sessionStopped: "Session terminee",

    markerAuto: "Signal detecteur",
    markerManual: "Marqueur manuel",
    markerFind: "Trouvaille",

    privacyPrivate: "Prive",
    privacyBlurred: "Floutee",
    privacyGroup: "Groupe",
    privacyGhost: "Fantome",
  },
};

export const APP_CONSTANTS = {
  gpsAccuracyThreshold: 20,
  gpsUpdateInterval: 1000,
  gpsDistanceInterval: 10,

  bleMaxDistance: 100,
  bleSignalThreshold: 30,

  defaultMapStyle: "osm",
  mapZoomDefault: 14,
  mapZoomMin: 10,
  mapZoomMax: 20,

  sessionMaxDuration: 86400 * 1000,
  sessionAutoSaveInterval: 30000,

  defaultPrivacyMode: "private" as const,
};
