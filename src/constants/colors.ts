/**
 * RockSense Color System
 * Basé sur la charte RockSense 2026
 */

export const COLORS = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ALIAS PRINCIPAUX (compatibilité UI)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Couleur principale - vert profond */
  primary: "#1A3A1A",

  /** Couleur accent - or premium */
  accent: "#D4AF37",

  /** Couleur erreur */
  error: "#c0392b",

  /** Couleur carte de fond */
  cardBackground: "#ffffff",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIMAIRES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Vert profond - fond, texte sombre */
  verdProfond: "#1A3A1A",

  /** Or premium - accents, highlights */
  orPremium: "#D4AF37",

  /** Vert clair - boutons, highlights */
  vertClair: "#3DB03D",

  /** Noir profond - backgrounds sombres */
  noirProfond: "#0F0F0F",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEUTRES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Arrière-plan principal */
  background: "#f4f5f3",

  /** Surface - cartes, modales */
  surface: "#ffffff",

  /** Texte principal */
  text: "#14150f",

  /** Texte secondaire */
  textSecondary: "#4a4d44",

  /** Texte tertiaire - hints, labels */
  textTertiary: "#898c81",

  /** Bordure */
  border: "#e4e6df",

  /** Diviseur */
  divider: "#eaeaea",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATUTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Succès - trouvailles, confirmations */
  success: "#3DB03D",

  /** Danger - erreurs, suppressions */
  danger: "#c0392b",

  /** Warning - alertes */
  warning: "#e8a020",

  /** Info - informations */
  info: "#1976d2",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MARQUEURS (MAP)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Détecteur automatique */
  markerAuto: "#e8a020",

  /** Marqueur manuel */
  markerManual: "#3DB03D",

  /** Trouvaille détectée */
  markerFind: "#c0392b",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MODES CONFIDENTIALITÉ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Mode privé */
  modePrivate: "#1A3A1A",

  /** Mode floutée */
  modeBlurred: "#6B8E7F",

  /** Mode groupe */
  modeGroup: "#3DB03D",

  /** Mode fantôme */
  modeGhost: "#898c81",

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SPÉCIAUX (DESIGN)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Gradient fond clair */
  gradientLight: "#f4f5f3",

  /** Gradient fond sombre */
  gradientDark: "#e9ece5",

  /** Trace GPS */
  gpsTrace: "#0066cc",

  /** Carte - eau */
  mapWater: "#e8f4f8",

  /** Carte - bâtiments */
  mapBuilding: "#f5f5f5",

};

/**
 * Alias rapides pour différents usages
 */
export const COLOR_ALIASES = {
  primary: COLORS.verdProfond,
  accent: COLORS.orPremium,
  success: COLORS.vertClair,
  error: COLORS.danger,
  disabled: COLORS.textTertiary,
};

/**
 * Transparences
 */
export const ALPHA = {
  light: 0.1,
  medium: 0.3,
  strong: 0.6,
  opaque: 1,
};
