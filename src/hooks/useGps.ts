import { calculateConfidenceLevel } from "@/src/services/GpsQualityService";
import { GpsPoint } from "@/src/services/sessionService";
import { haversineMeters } from "@/src/utils/distance";
import { kalmanInit, kalmanReset, kalmanUpdate, KalmanState } from "@/src/utils/kalmanGps";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Filtrage ──────────────────────────────────────────────────────────────────
/** Rejeter les mesures GPS pires que ce seuil */
const MAX_ACCURACY_M     = 30;   // était 40 — plus strict
/** Rejeter les sauts physiquement impossibles (téléportation) */
const MAX_JUMP_M         = 40;   // était 50
/** Vitesse en dessous de laquelle on considère stationnaire */
const STATIONARY_SPEED_MPS = 0.4;
/** Pas minimum pour ajouter un point à la trace */
const MIN_TRACE_STEP_M   = 2.0;  // était 2.5
/** Rayon de bruit stationnaire de base */
const STATIONARY_TRACE_RADIUS_M = 3.5;

function getStationaryRadius(accuracyMeters: number): number {
  return Math.max(STATIONARY_TRACE_RADIUS_M, Math.min(7, accuracyMeters * 0.25));
}

export interface GpsLocation {
  lat: number;
  lon: number;
  accuracy: number;
  accuracyMeters?: number;
  altitude?: number;
  speed?: number;
  speedMps?: number;
  bearingDeg?: number;
  timestamp: number;
}

export function useGps() {
  const [location, setLocation] = useState<GpsLocation | null>(null);
  const [gpsTrace, setGpsTrace]   = useState<GpsPoint[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [distance, setDistance]   = useState(0);

  const subscriptionRef   = useRef<Location.LocationSubscription | null>(null);
  const lastAcceptedRef   = useRef<GpsPoint | null>(null);
  /** État Kalman — null tant que pas de première mesure valide */
  const kalmanRef         = useRef<KalmanState | null>(null);

  // ── Permission ────────────────────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      if (!granted) setError("Permission GPS refusée");
      return granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur permission GPS");
      return false;
    }
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────
  const resetGps = useCallback(() => {
    setDistance(0);
    setGpsTrace([]);
    lastAcceptedRef.current = null;
    if (kalmanRef.current) kalmanReset(kalmanRef.current);
    kalmanRef.current = null;
  }, []);

  // ── Stop ──────────────────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsTracking(false);
  }, []);

  // ── Cœur GPS avec Kalman ──────────────────────────────────────────────
  const acceptLocation = useCallback(
    (loc: Location.LocationObject, onPoint?: (point: GpsPoint) => void) => {
      const accuracyMeters = loc.coords.accuracy ?? 999;

      // Rejeter les mesures trop imprécises
      if (accuracyMeters > MAX_ACCURACY_M) return;

      const rawLat   = loc.coords.latitude;
      const rawLon   = loc.coords.longitude;
      const timestamp = Date.now();

      // ── Filtre de Kalman ────────────────────────────────────────────
      let filtered: { lat: number; lon: number; speedMps: number; bearingDeg: number };

      if (!kalmanRef.current) {
        // Première mesure : initialiser le filtre
        kalmanRef.current = kalmanInit(rawLat, rawLon, accuracyMeters, timestamp);
        filtered = { lat: rawLat, lon: rawLon, speedMps: 0, bearingDeg: 0 };
      } else {
        filtered = kalmanUpdate(
          kalmanRef.current,
          rawLat,
          rawLon,
          accuracyMeters,
          timestamp,
        );
      }

      // Vitesse : Kalman en priorité, capteur hardware en fallback
      const speedMps = filtered.speedMps > 0.1
        ? filtered.speedMps
        : Math.max(0, loc.coords.speed ?? 0);

      // Cap : Kalman si vitesse suffisante, hardware sinon
      const bearingDeg = filtered.speedMps > 0.5
        ? filtered.bearingDeg
        : (loc.coords.heading != null && loc.coords.heading >= 0
            ? loc.coords.heading
            : undefined);

      const confidenceLevel = calculateConfidenceLevel({
        accuracyMeters,
        speedMps,
        pointAgeMs: 0,
      });

      // ── Mise à jour UI avec position filtrée ────────────────────────
      setLocation({
        lat:          filtered.lat,
        lon:          filtered.lon,
        accuracy:     accuracyMeters,
        accuracyMeters,
        speed:        loc.coords.speed ?? undefined,
        speedMps,
        bearingDeg,
        altitude:     loc.coords.altitude ?? undefined,
        timestamp,
      });

      // ── Logique trace / distance ─────────────────────────────────────
      const point: GpsPoint = {
        lat:           filtered.lat,
        lon:           filtered.lon,
        accuracy:      accuracyMeters,
        accuracyMeters,
        speedMps,
        confidenceLevel,
        bearingDeg,
        altitude:      loc.coords.altitude ?? undefined,
        timestamp,
      };

      const last = lastAcceptedRef.current;

      if (!last) {
        lastAcceptedRef.current = point;
        setGpsTrace([point]);
        onPoint?.(point);
        return;
      }

      // Utiliser la position filtrée pour calculer le déplacement
      const jump = haversineMeters(last.lat, last.lon, point.lat, point.lon);

      // Rejeter téléportation (le filtre ne peut pas rattraper les sauts impossibles)
      if (jump > MAX_JUMP_M) return;

      // Pas minimum
      if (jump < MIN_TRACE_STEP_M) return;

      // Bruit stationnaire : si lent ET dans le rayon d'incertitude → ignorer
      const stationaryRadius = getStationaryRadius(accuracyMeters);
      if (speedMps < STATIONARY_SPEED_MPS && jump < stationaryRadius) return;

      // ✅ Point accepté
      lastAcceptedRef.current = point;
      setGpsTrace((prev) => [...prev, point]);
      setDistance((prev) => prev + jump);
      onPoint?.(point);
    },
    [],
  );

  // ── Start ─────────────────────────────────────────────────────────────
  const startTracking = useCallback(
    async (onPoint?: (point: GpsPoint) => void) => {
      if (subscriptionRef.current) return;

      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      try {
        setError(null);
        setIsTracking(true);

        // Premier fix en haute précision (plus lent mais meilleure position initiale)
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        acceptLocation(current, onPoint);

        // Écoute continue : pas de distanceInterval pour laisser Kalman décider
        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy:         Location.Accuracy.BestForNavigation,
            timeInterval:     800,   // 800ms entre mises à jour
            distanceInterval: 0,     // laisser le filtre gérer le bruit
          },
          (loc) => acceptLocation(loc, onPoint),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur GPS");
        setIsTracking(false);
      }
    },
    [acceptLocation, requestPermission],
  );

  useEffect(() => stopTracking, [stopTracking]);

  return {
    location,
    gpsTrace,
    isTracking,
    error,
    distance,
    startTracking,
    stopTracking,
    resetGps,
    resetDistance: resetGps,
    requestPermission,
  };
}
