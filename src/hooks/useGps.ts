import { calculateConfidenceLevel } from "@/src/services/GpsQualityService";
import { GpsPoint } from "@/src/services/sessionService";
import { haversineMeters } from "@/src/utils/distance";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_ACCURACY_M = 40;
const MAX_JUMP_M = 50;
const STATIONARY_SPEED_MPS = 0.5;

const DISPLAY_DEADBAND_M = 1.2;
const DISPLAY_SMOOTHING = 0.35;
const MIN_TRACE_STEP_M = 2.5;
const STATIONARY_TRACE_RADIUS_M = 4;

function getStationaryRadius(accuracyMeters: number): number {
  return Math.max(STATIONARY_TRACE_RADIUS_M, Math.min(8, accuracyMeters * 0.3));
}

function interpolatePoint(
  previous: GpsPoint,
  next: GpsPoint,
  ratio: number,
): GpsPoint {
  return {
    ...next,
    lat: previous.lat + (next.lat - previous.lat) * ratio,
    lon: previous.lon + (next.lon - previous.lon) * ratio,
  };
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
  const [gpsTrace, setGpsTrace] = useState<GpsPoint[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState(0);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastAcceptedRef = useRef<GpsPoint | null>(null);
  const lastDisplayRef = useRef<GpsPoint | null>(null);

  // ✅ Permission GPS
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      if (!granted) setError("Permission GPS refusee");
      return granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur permission GPS");
      return false;
    }
  }, []);

  // ✅ Reset
  const resetGps = useCallback(() => {
    setDistance(0);
    setGpsTrace([]);
    lastAcceptedRef.current = null;
    lastDisplayRef.current = null;
  }, []);

  // ✅ Stop tracking
  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsTracking(false);
  }, []);

  // ✅ Core GPS logic
  const acceptLocation = useCallback(
    (loc: Location.LocationObject, onPoint?: (point: GpsPoint) => void) => {
      const accuracyMeters = loc.coords.accuracy ?? 999;
      if (accuracyMeters > MAX_ACCURACY_M) return;

      const speedMps = Math.max(0, loc.coords.speed ?? 0);
      const heading = loc.coords.heading;
      const timestamp = Date.now();

      const confidenceLevel = calculateConfidenceLevel({
        accuracyMeters,
        speedMps,
        pointAgeMs: 0,
      });

      const point: GpsPoint = {
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        accuracy: accuracyMeters,
        accuracyMeters,
        speedMps,
        confidenceLevel,
        bearingDeg: heading !== null && heading >= 0 ? heading : undefined,
        altitude: loc.coords.altitude ?? undefined,
        timestamp,
      };

      // ✅ Smooth UI position
      const lastDisplay = lastDisplayRef.current;
      const displayJump = lastDisplay
        ? haversineMeters(
            lastDisplay.lat,
            lastDisplay.lon,
            point.lat,
            point.lon,
          )
        : 0;

      const displayPoint =
        lastDisplay && displayJump < DISPLAY_DEADBAND_M
          ? {
              ...lastDisplay,
              accuracy: accuracyMeters,
              accuracyMeters,
              timestamp,
            }
          : lastDisplay
            ? interpolatePoint(lastDisplay, point, DISPLAY_SMOOTHING)
            : point;

      lastDisplayRef.current = displayPoint;

      setLocation({
        ...displayPoint,
        accuracy: accuracyMeters,
        accuracyMeters,
        speed: loc.coords.speed ?? undefined,
        speedMps,
        timestamp,
      });

      // ✅ Distance + trace logic
      const last = lastAcceptedRef.current;

      if (!last) {
        lastAcceptedRef.current = point;
        setGpsTrace([point]);
        onPoint?.(point);
        return;
      }

      const jump = haversineMeters(last.lat, last.lon, point.lat, point.lon);

      // ❌ Ignore jump GPS aberrant
      if (jump > MAX_JUMP_M) return;

      // ❌ Ignore micro jitter
      if (jump < MIN_TRACE_STEP_M) return;

      // ❌ Ignore bruit stationnaire
      const stationaryRadius = getStationaryRadius(accuracyMeters);
      const isStationaryNoise =
        speedMps < STATIONARY_SPEED_MPS && jump < stationaryRadius;

      if (isStationaryNoise) return;

      // ✅ Accept point
      lastAcceptedRef.current = point;

      setGpsTrace((prev) => [...prev, point]);
      setDistance((prev) => prev + jump);

      onPoint?.(point);
    },
    [],
  );

  // ✅ Start tracking
  const startTracking = useCallback(
    async (onPoint?: (point: GpsPoint) => void) => {
      if (subscriptionRef.current) return;

      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      try {
        setError(null);
        setIsTracking(true);

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        acceptLocation(current, onPoint);

        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 2,
            timeInterval: 1000,
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
