/**
 * WalkSense Branding
 * Logo, marques, textes constants
 */

export const BRANDING = {
  name: "WalkSense",
  tagline: "Tracking & Exploration de Terrain",
  description: "Prospection assistée par GPS et détecteur de métaux",
  version: "1.0.0",

  // Couleurs du logo
  logo: {
    primary: "#D4AF37", // Or
    secondary: "#1A3A1A", // Vert profond
    accent: "#3DB03D", // Vert clair
  },

  // URLs assets (à mettre à jour quand tu auras les images)
  assets: {
    logoPrimary: require("../../assets/logo/walksense-color.png"),
    logoMonoGold: require("../../assets/logo/walksense-mono-gold.png"),
    logoMonoGreen: require("../../assets/logo/walksense-mono-green.png"),
    logoMonoWhite: require("../../assets/logo/walksense-mono-white.png"),
    favicon: require("../../assets/logo/favicon.ico"),
  },

  // Textes constants
  copy: {
    sessionNew: "Nouvelle session",
    sessionRunning: "Session en cours",
    sessionPaused: "Session en pause",
    sessionStopped: "Session terminée",

    markerAuto: "Signal détecteur",
    markerManual: "Marqueur manuel",
    markerFind: "Trouvaille",

    privacyPrivate: "Privé",
    privacyBlurred: "Floutée",
    privacyGroup: "Groupe",
    privacyGhost: "Fantôme",
  },
};

/**
 * Contantes de l'app
 */
export const APP_CONSTANTS = {
  // GPS
  gpsAccuracyThreshold: 20, // mètres
  gpsUpdateInterval: 1000, // ms
  gpsDistanceInterval: 10, // mètres

  // BLE Détecteur
  bleMaxDistance: 100, // mètres
  bleSignalThreshold: 30, // % du signal min détectable

  // Cartes
  defaultMapStyle: "osm",
  mapZoomDefault: 14,
  mapZoomMin: 10,
  mapZoomMax: 20,

  // Session
  sessionMaxDuration: 86400 * 1000, // 24 heures en ms
  sessionAutoSaveInterval: 30000, // 30 secondes

  // Confidentialité
  defaultPrivacyMode: "private" as const,
};
