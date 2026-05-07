import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GpsLocation {
  lat: number;
  lon: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
}

export function useGps() {
  const [location, setLocation] = useState<GpsLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState(0);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastPosRef = useRef<GpsLocation | null>(null);

  /**
   * Demander les permissions
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur permission");
      return false;
    }
  }, []);

  /**
   * Démarrer le suivi GPS
   */
  const startTracking = useCallback(async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setError("Permission GPS refusée");
        return;
      }

      setIsTracking(true);
      setDistance(0);
      lastPosRef.current = null;

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2,
          timeInterval: 1000,
        },
        (loc) => {
          const newLocation: GpsLocation = {
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? undefined,
            altitude: loc.coords.altitude ?? undefined,
            speed: loc.coords.speed ?? undefined,
          };

          setLocation(newLocation);

          // Calculer la distance parcourue
          if (lastPosRef.current) {
            const d = haversineKm(
              lastPosRef.current.lat,
              lastPosRef.current.lon,
              newLocation.lat,
              newLocation.lon,
            );
            setDistance((prev) => prev + d);
          }

          lastPosRef.current = newLocation;
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur GPS";
      setError(message);
      setIsTracking(false);
    }
  }, [requestPermission]);

  /**
   * Arrêter le suivi GPS
   */
  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsTracking(false);
  }, []);

  /**
   * Réinitialiser la distance
   */
  const resetDistance = useCallback(() => {
    setDistance(0);
    lastPosRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    location,
    isTracking,
    error,
    distance,
    startTracking,
    stopTracking,
    resetDistance,
    requestPermission,
  };
}
