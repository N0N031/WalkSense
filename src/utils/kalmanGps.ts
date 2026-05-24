/**
 * kalmanGps.ts — Filtre de Kalman 2D pour GPS
 *
 * Modèle : position (lat, lon) + vitesse (vLat, vLon)
 * État : [lat, lon, vLat, vLon]
 *
 * Le filtre fusionne les mesures GPS (bruitées) avec un modèle de mouvement
 * constant pour produire une estimation lissée et prédictive.
 *
 * Avantages vs interpolation linéaire :
 *  - Prédit la position entre les mises à jour (réduit le lag)
 *  - S'adapte au bruit de mesure (accuracy GPS) dynamiquement
 *  - Maintient une estimation de la vitesse
 *  - Converge rapidement après un saut GPS
 */

export interface KalmanState {
  /** Position estimée */
  lat: number;
  lon: number;
  /** Vitesse estimée (degrés/s) */
  vLat: number;
  vLon: number;
  /** Matrice de covariance d'erreur [4x4] stockée à plat */
  P: number[];
  /** Timestamp du dernier update (ms) */
  lastTs: number;
}

/**
 * Bruit de processus — contrôle la réactivité vs stabilité.
 * Valeur élevée = suit mieux les virages brusques mais plus bruité.
 * Valeur faible = plus lisse mais réagit moins vite aux changements de direction.
 * ~1.5 m/s² d'accélération max attendue (marche terrain).
 */
const PROCESS_NOISE_ACCEL = 1.5; // m/s²

/** 1 degré lat ≈ 111 320 m */
const DEG_PER_METER_LAT = 1 / 111320;

/** Crée un état Kalman initial depuis une première mesure GPS */
export function kalmanInit(
  lat: number,
  lon: number,
  accuracyMeters: number,
  timestamp: number,
): KalmanState {
  // Covariance initiale : incertitude position = accuracy², vitesse = (2 m/s)²
  const posVar = (accuracyMeters * DEG_PER_METER_LAT) ** 2;
  const velVar = (2 * DEG_PER_METER_LAT) ** 2; // ~2 m/s incertitude initiale

  return {
    lat,
    lon,
    vLat: 0,
    vLon: 0,
    lastTs: timestamp,
    // P diagonale 4x4 : [posLat, posLon, velLat, velLon]
    P: [
      posVar, 0,      0,      0,
      0,      posVar, 0,      0,
      0,      0,      velVar, 0,
      0,      0,      0,      velVar,
    ],
  };
}

/**
 * Met à jour le filtre avec une nouvelle mesure GPS.
 * @param state  État courant du filtre (muté en place)
 * @param lat    Mesure latitude brute
 * @param lon    Mesure longitude brute
 * @param accuracyMeters  Précision GPS en mètres (ex: 8)
 * @param timestamp       Timestamp de la mesure (ms)
 * @returns     Position lissée {lat, lon, speedMps, bearingDeg}
 */
export function kalmanUpdate(
  state: KalmanState,
  lat: number,
  lon: number,
  accuracyMeters: number,
  timestamp: number,
): { lat: number; lon: number; speedMps: number; bearingDeg: number } {
  const dt = Math.max(0.05, Math.min(5, (timestamp - state.lastTs) / 1000)); // clamp 50ms–5s
  state.lastTs = timestamp;

  // ── Étape 1 : PRÉDICTION ──────────────────────────────────────────────
  // x_pred = F * x  (modèle mouvement constant)
  const latPred = state.lat + state.vLat * dt;
  const lonPred = state.lon + state.vLon * dt;
  const vLatPred = state.vLat;
  const vLonPred = state.vLon;

  // P_pred = F * P * F^T + Q
  // Pour F = [[1,0,dt,0],[0,1,0,dt],[0,0,1,0],[0,0,0,1]]
  // Bruit de processus Q lié à l'accélération : σa²·[dt⁴/4, dt³/2, dt²]
  const dt2 = dt * dt;
  const dt3 = dt2 * dt;
  const dt4 = dt2 * dt2;
  const sa2 = (PROCESS_NOISE_ACCEL * DEG_PER_METER_LAT) ** 2;

  const P = state.P;

  // P_pred = F·P·Fᵀ (mise à jour covariance avec mouvement)
  // P[0..3] = indices [row*4+col], layout [pLL pLl pLv pvv ...]
  // On utilise les indices : 0=latLat, 1=latLon, 2=latVLat, 3=latVLon
  //                          4=lonLat, 5=lonLon, 6=lonVLat, 7=lonVLon
  //                          8=vLatLat,9=vLatLon,10=vLatVLat,11=vLatVLon
  //                         12=vLonLat,13=vLonLon,14=vLonVLat,15=vLonVLon
  const pp = [
    P[0] + dt*(P[2]+P[8]) + dt2*P[10],         // 0
    P[1] + dt*(P[3]+P[9]) + dt2*P[11],          // 1
    P[2] + dt*P[10],                             // 2
    P[3] + dt*P[11],                             // 3
    P[4] + dt*(P[6]+P[12]) + dt2*P[14],         // 4
    P[5] + dt*(P[7]+P[13]) + dt2*P[15],         // 5
    P[6] + dt*P[14],                             // 6
    P[7] + dt*P[15],                             // 7
    P[8] + dt*P[10],                             // 8
    P[9] + dt*P[11],                             // 9
    P[10],                                       // 10
    P[11],                                       // 11
    P[12] + dt*P[14],                            // 12
    P[13] + dt*P[15],                            // 13
    P[14],                                       // 14
    P[15],                                       // 15
  ];

  // Ajouter bruit de processus Q
  pp[0]  += sa2 * dt4 / 4;
  pp[5]  += sa2 * dt4 / 4;
  pp[10] += sa2 * dt2;
  pp[15] += sa2 * dt2;
  pp[2]  += sa2 * dt3 / 2;
  pp[8]  += sa2 * dt3 / 2;
  pp[7]  += sa2 * dt3 / 2;
  pp[13] += sa2 * dt3 / 2;

  // ── Étape 2 : MISE À JOUR (mesure GPS) ───────────────────────────────
  // H = [[1,0,0,0],[0,1,0,0]]  (on mesure lat et lon seulement)
  // R = diag(σlat², σlon²) avec σ = accuracyMeters en degrés
  const sigma = accuracyMeters * DEG_PER_METER_LAT;
  const R = sigma * sigma;

  // Innovation : y = z - H * x_pred
  const yLat = lat - latPred;
  const yLon = lon - lonPred;

  // S = H * P_pred * H^T + R  (innovation covariance)
  const sLat = pp[0] + R;
  const sLon = pp[5] + R;

  // K = P_pred * H^T * S^-1  (gain de Kalman)
  const kLatLat = pp[0] / sLat;
  const kLonLon = pp[5] / sLon;
  const kVLatLat = pp[8] / sLat;
  const kVLonLon = pp[13] / sLon;

  // x = x_pred + K * y  (mise à jour état)
  state.lat  = latPred  + kLatLat  * yLat;
  state.lon  = lonPred  + kLonLon  * yLon;
  state.vLat = vLatPred + kVLatLat * yLat;
  state.vLon = vLonPred + kVLonLon * yLon;

  // P = (I - K*H) * P_pred  (mise à jour covariance)
  state.P = [
    (1 - kLatLat)  * pp[0],   (1 - kLatLat)  * pp[1],
    (1 - kLatLat)  * pp[2],   (1 - kLatLat)  * pp[3],
    (1 - kLonLon)  * pp[4],   (1 - kLonLon)  * pp[5],
    (1 - kLonLon)  * pp[6],   (1 - kLonLon)  * pp[7],
    (1 - kVLatLat) * pp[8],   (1 - kVLatLat) * pp[9],
    (1 - kVLatLat) * pp[10],  (1 - kVLatLat) * pp[11],
    (1 - kVLonLon) * pp[12],  (1 - kVLonLon) * pp[13],
    (1 - kVLonLon) * pp[14],  (1 - kVLonLon) * pp[15],
  ];

  // ── Dériver vitesse et cap depuis les vitesses estimées ───────────────
  const vLatMs = state.vLat / DEG_PER_METER_LAT; // m/s latitudinal
  const vLonMs = (state.vLon / DEG_PER_METER_LAT) * Math.cos(lat * Math.PI / 180);
  const speedMps = Math.sqrt(vLatMs * vLatMs + vLonMs * vLonMs);
  const bearingDeg = speedMps > 0.3
    ? (Math.atan2(vLonMs, vLatMs) * 180 / Math.PI + 360) % 360
    : 0;

  return { lat: state.lat, lon: state.lon, speedMps, bearingDeg };
}

/** Réinitialise le filtre (début nouvelle session) */
export function kalmanReset(state: KalmanState): void {
  state.vLat = 0;
  state.vLon = 0;
  state.lastTs = 0;
  state.P = [999,0,0,0, 0,999,0,0, 0,0,999,0, 0,0,0,999];
}
