/**
 * GPS Service
 * Gère la localisation en temps réel avec simulation mode développeur
 */

import * as Location from "expo-location";
import { Platform } from "react-native";

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

class GpsService {
  private subscription: Location.LocationSubscription | null = null;
  private simulationMode: boolean = false;
  private simulationIndex: number = 0;

  // Simulation path (Paris region)
  private simulationPath = [
    { lat: 48.8566, lon: 2.3522 },
    { lat: 48.857, lon: 2.353 },
    { lat: 48.8575, lon: 2.354 },
    { lat: 48.858, lon: 2.355 },
    { lat: 48.8585, lon: 2.356 },
    { lat: 48.859, lon: 2.357 },
    { lat: 48.8595, lon: 2.358 },
    { lat: 48.86, lon: 2.359 },
  ];

  async initialize(): Promise<void> {
    if (Platform.OS !== "web") {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("⚠️ GPS permission denied");
      }
    }
  }

  async startTracking(
    callback: (location: GpsLocation) => void,
    simulation: boolean = false,
  ): Promise<void> {
    this.simulationMode = simulation;

    if (this.simulationMode) {
      // Mode simulation
      this.startSimulation(callback);
    } else {
      // Mode réel
      if (Platform.OS !== "web") {
        this.subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000, // Update every 1s
            distanceInterval: 0, // Distance-based updates disabled
          },
          (location) => {
            callback({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              altitude: location.coords.altitude,
              heading: location.coords.heading,
              speed: location.coords.speed,
              timestamp: location.timestamp,
            });
          },
        );
      }
    }
  }

  private startSimulation(callback: (location: GpsLocation) => void): void {
    const interval = setInterval(() => {
      const point =
        this.simulationPath[this.simulationIndex % this.simulationPath.length];

      // Add slight random jitter
      const jitter = 0.0001;
      const lat = point.lat + (Math.random() - 0.5) * jitter;
      const lon = point.lon + (Math.random() - 0.5) * jitter;

      callback({
        latitude: lat,
        longitude: lon,
        accuracy: 3.5 + Math.random() * 2,
        altitude: 45 + Math.random() * 5,
        heading: (this.simulationIndex * 15) % 360,
        speed: 1.2 + Math.random() * 0.3,
        timestamp: Date.now(),
      });

      this.simulationIndex++;
    }, 1000);

    // Store interval ID pour stopTracking
    (this as any).simulationInterval = interval;
  }

  stopTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    if ((this as any).simulationInterval) {
      clearInterval((this as any).simulationInterval);
    }
  }

  async getLastLocation(): Promise<GpsLocation | null> {
    if (Platform.OS === "web") return null;

    const location = await Location.getLastKnownPositionAsync();
    if (!location) return null;

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
  }
}

export const gpsService = new GpsService();
