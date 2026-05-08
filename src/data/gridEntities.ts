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

export interface CoverageCellEntity {
  cellId: string;
  sessionId: string;
  centerLat: number;
  centerLon: number;
  cellSizeMeter: 1 | 2;
  radiusUsedMeters: number;
  confidenceLevel: ConfidenceLevel;
  confidenceSource: string;
  timestamp: number;
}

export interface CoverageCell {
  cellId: string;
  sessionId: string;
  centerLat: number;
  centerLon: number;
  cellSizeMeter: 1 | 2;
  radiusUsedMeters: number;
  confidenceLevel: ConfidenceLevel;
  confidenceSource: string;
  timestamp: number;
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

export function coverageCellEntityToCell(
  entity: CoverageCellEntity,
): CoverageCell {
  return {
    cellId: entity.cellId,
    sessionId: entity.sessionId,
    centerLat: entity.centerLat,
    centerLon: entity.centerLon,
    cellSizeMeter: entity.cellSizeMeter,
    radiusUsedMeters: entity.radiusUsedMeters,
    confidenceLevel: entity.confidenceLevel,
    confidenceSource: entity.confidenceSource,
    timestamp: entity.timestamp,
  };
}

export function coverageCellToEntity(cell: CoverageCell): CoverageCellEntity {
  return {
    cellId: cell.cellId,
    sessionId: cell.sessionId,
    centerLat: cell.centerLat,
    centerLon: cell.centerLon,
    cellSizeMeter: cell.cellSizeMeter,
    radiusUsedMeters: cell.radiusUsedMeters,
    confidenceLevel: cell.confidenceLevel,
    confidenceSource: cell.confidenceSource,
    timestamp: cell.timestamp,
  };
}
