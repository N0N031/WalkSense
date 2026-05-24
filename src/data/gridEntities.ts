import type { GpsPoint } from "@/src/services/sessionService";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface GpsPointEntity {
  id?: number;
  sessionId: string;
  lat: number;
  lon: number;
  accuracy: number;
  accuracyMeters: number;
  timestamp: number;
  altitude: number | null;
  speedMps: number | null;
  confidenceLevel: ConfidenceLevel;
  bearingDeg: number | null;
  satellitesCount: number | null;
}

export function gpsPointToEntity(
  sessionId: string,
  point: GpsPoint,
): GpsPointEntity {
  return {
    sessionId,
    lat: point.lat,
    lon: point.lon,
    accuracy: point.accuracy,
    accuracyMeters: point.accuracyMeters ?? point.accuracy,
    timestamp: point.timestamp,
    altitude: point.altitude ?? null,
    speedMps: point.speedMps ?? null,
    confidenceLevel: point.confidenceLevel ?? "LOW",
    bearingDeg: point.bearingDeg ?? null,
    satellitesCount: point.satellitesCount ?? null,
  };
}

export function gpsPointEntityToPoint(entity: GpsPointEntity): GpsPoint {
  return {
    lat: entity.lat,
    lon: entity.lon,
    accuracy: entity.accuracy,
    accuracyMeters: entity.accuracyMeters,
    timestamp: entity.timestamp,
    altitude: entity.altitude ?? undefined,
    speedMps: entity.speedMps ?? undefined,
    confidenceLevel: entity.confidenceLevel,
    bearingDeg: entity.bearingDeg ?? undefined,
    satellitesCount: entity.satellitesCount ?? undefined,
  };
}
