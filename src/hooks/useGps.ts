import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { GpsPoint } from "@/src/services/sessionService";
import { calculateConfidenceLevel } from "@/src/services/GpsQualityService";
import { haversineMeters } from "@/src/utils/distance";

const MAX_ACCURACY_M = 40;
const MAX_JUMP_M = 50;

export interface GpsLocation {
  lat: number;
  lon: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
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

  const resetGps = useCallback(() => {
    setDistance(0);
    setGpsTrace([]);
    lastAcceptedRef.current = null;
  }, []);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(
    async (onPoint?: (point: GpsPoint) => void) => {
      if (subscriptionRef.current) return;

      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      try {
        setError(null);
        setIsTracking(true);

        subscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 2,
            timeInterval: 1000,
          },
          (loc) => {
            const accuracyMeters = loc.coords.accuracy ?? 10;
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
              bearingDeg:
                heading !== null && heading >= 0 ? heading : undefined,
              altitude: loc.coords.altitude ?? undefined,
              timestamp,
            };

            const last = lastAcceptedRef.current;
            if (last) {
              const jump = haversineMeters(last.lat, last.lon, point.lat, point.lon);
              if (jump > MAX_JUMP_M) return;
              setDistance((prev) => prev + jump);
            }

            lastAcceptedRef.current = point;
            setLocation({
              ...point,
              speed: loc.coords.speed ?? undefined,
            });
            setGpsTrace((prev) => [...prev, point]);
            onPoint?.(point);
          },
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur GPS");
        setIsTracking(false);
      }
    },
    [requestPermission],
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
