import type { ConfidenceLevel } from "@/src/data/gridEntities";

export interface GpsQualityParams {
  accuracyMeters: number;
  speedMps?: number;
  pointAgeMs?: number;
  trajectoryStability?: number;
}

export interface AdaptiveRadiusParams {
  speedMps: number;
  accuracyMeters: number;
  confidenceLevel: ConfidenceLevel;
}

export function calculateConfidenceLevel(
  params: GpsQualityParams,
): ConfidenceLevel {
  const pointAgeMs = params.pointAgeMs ?? 0;

  if (params.accuracyMeters <= 3 && pointAgeMs < 10000) {
    return "HIGH";
  }

  if (params.accuracyMeters <= 6) {
    return "MEDIUM";
  }

  return "LOW";
}

export function calculateAdaptiveRadius(
  params: AdaptiveRadiusParams,
): number {
  const k = 0.5;
  const safeSpeedMps = Number.isFinite(params.speedMps)
    ? Math.max(0, params.speedMps)
    : 0;
  const radiusBase = 1.0 + safeSpeedMps * k;
  let radius = Math.max(1.0, Math.min(2.0, radiusBase));

  if (params.confidenceLevel === "LOW") {
    radius = 2.0;
  } else if (params.confidenceLevel === "HIGH") {
    radius = Math.min(radius, 1.2);
  }

  return radius;
}

export function calculateCellId(
  lat: number,
  lon: number,
  cellSizeMeters: 1 | 2,
): string {
  const { cellX, cellY } = calculateCellCoords(lat, lon, cellSizeMeters);
  return coordsToCellId(cellX, cellY, cellSizeMeters);
}

export function calculateCellCoords(
  lat: number,
  lon: number,
  cellSizeMeters: 1 | 2,
): { cellX: number; cellY: number } {
  const mPerDegLat = 111000;
  const mPerDegLon = metersPerDegreeLon(lat);
  const meterX = lon * mPerDegLon;
  const meterY = lat * mPerDegLat;

  return {
    cellX: Math.floor(meterX / cellSizeMeters),
    cellY: Math.floor(meterY / cellSizeMeters),
  };
}

export function coordsToCellId(
  cellX: number,
  cellY: number,
  cellSizeMeters: 1 | 2,
): string {
  return `CELL_${cellSizeMeters}m_${cellX}_${cellY}`;
}

export function cellIdToCoords(cellId: string): {
  cellSizeMeters: 1 | 2;
  cellX: number;
  cellY: number;
} {
  const match = /^CELL_(1|2)m_(-?\d+)_(-?\d+)$/.exec(cellId);
  if (!match) {
    throw new Error(`Invalid cellId: ${cellId}`);
  }

  return {
    cellSizeMeters: match[1] === "1" ? 1 : 2,
    cellX: Number(match[2]),
    cellY: Number(match[3]),
  };
}

export function getCellCenter(
  cellId: string,
): { lat: number; lon: number } {
  const { cellSizeMeters, cellX, cellY } = cellIdToCoords(cellId);
  const mPerDegLat = 111000;
  const lat = ((cellY + 0.5) * cellSizeMeters) / mPerDegLat;
  const lon =
    ((cellX + 0.5) * cellSizeMeters) / metersPerDegreeLon(lat);

  return { lat, lon };
}

function metersPerDegreeLon(lat: number): number {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  return 111000 * Math.max(0.000001, Math.abs(cosLat));
}
