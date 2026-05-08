import type {
    ConfidenceLevel,
    CoverageCellEntity,
} from "@/src/data/gridEntities";
import { sessionRepository } from "@/src/data/sessionRepository";
import {
    calculateAdaptiveRadius,
    calculateCellCoords,
    calculateCellId,
    cellIdToCoords,
    coordsToCellId,
    getCellCenter,
} from "@/src/services/GpsQualityService";
import type { GpsPoint } from "@/src/services/sessionService";
import { haversineMeters } from "@/src/utils/distance";

export interface GenerateCoverageParams {
  sessionId: string;
  gpsPoints: GpsPoint[];
  cellSizeMeters?: 1 | 2;
}

type DatabaseHandle = unknown;

export async function generateCoverageFromTrajectory(
  params: GenerateCoverageParams,
): Promise<CoverageCellEntity[]> {
  const cellSizeMeters = params.cellSizeMeters ?? 1;
  const cells = new Map<string, CoverageCellEntity>();

  for (const point of params.gpsPoints) {
    if (!isValidPoint(point)) continue;

    const confidenceLevel = point.confidenceLevel ?? "LOW";
    const accuracyMeters = point.accuracyMeters ?? point.accuracy;
    const speedMps = point.speedMps ?? 0;
    const radius = calculateAdaptiveRadius({
      speedMps,
      accuracyMeters,
      confidenceLevel,
    });
    const affectedCells = getAllCellsInRadius(
      point.lat,
      point.lon,
      radius,
      cellSizeMeters,
    );

    for (const cellId of affectedCells) {
      const current = cells.get(cellId);
      if (!current) {
        const center = getCellCenter(cellId);
        cells.set(cellId, {
          cellId,
          sessionId: params.sessionId,
          centerLat: center.lat,
          centerLon: center.lon,
          cellSizeMeter: cellSizeMeters,
          radiusUsedMeters: radius,
          confidenceLevel,
          confidenceSource: `gps_accuracy_${accuracyMeters.toFixed(1)}m`,
          timestamp: point.timestamp,
        });
        continue;
      }

      if (
        confidenceOrder(confidenceLevel) >
        confidenceOrder(current.confidenceLevel)
      ) {
        current.confidenceLevel = confidenceLevel;
        current.confidenceSource = `gps_accuracy_${accuracyMeters.toFixed(1)}m`;
        current.timestamp = point.timestamp;
      }
      current.radiusUsedMeters = Math.max(current.radiusUsedMeters, radius);
    }
  }

  return Array.from(cells.values());
}

export async function persistCoverageCells(
  _db: DatabaseHandle,
  cells: CoverageCellEntity[],
): Promise<void> {
  const deduped = Array.from(
    new Map(cells.map((cell) => [cell.cellId, cell])).values(),
  );
  await sessionRepository.upsertCoverageCells(deduped);
}

export function getAllCellsInRadius(
  lat: number,
  lon: number,
  radiusMeters: number,
  cellSizeMeters: 1 | 2,
): string[] {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return [calculateCellId(lat, lon, cellSizeMeters)];
  }

  const cells: string[] = [];
  const centerCellId = calculateCellId(lat, lon, cellSizeMeters);
  const { cellX, cellY } = cellIdToCoords(centerCellId);
  const searchRadius = Math.ceil(radiusMeters / cellSizeMeters) + 1;

  for (let dx = -searchRadius; dx <= searchRadius; dx += 1) {
    for (let dy = -searchRadius; dy <= searchRadius; dy += 1) {
      const cellId = coordsToCellId(cellX + dx, cellY + dy, cellSizeMeters);
      const cellCenter = getCellCenter(cellId);
      const dist = haversineMeters(lat, lon, cellCenter.lat, cellCenter.lon);
      if (dist <= radiusMeters) {
        cells.push(cellId);
      }
    }
  }

  return cells;
}

export function confidenceOrder(confidenceLevel: ConfidenceLevel): number {
  switch (confidenceLevel) {
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
  }
}

/**
 * PHASE 4: Deduplicate coverage cells, keeping highest confidence per cellId
 * Used for real-time grid buffer merging to avoid duplicates and maintain
 * the best available confidence level for each cell.
 */
export function deduplicateCells(
  cells: CoverageCellEntity[],
): CoverageCellEntity[] {
  const map = new Map<string, CoverageCellEntity>();

  for (const cell of cells) {
    const key = cell.cellId;
    const existing = map.get(key);

    // Keep highest confidence
    if (
      !existing ||
      confidenceOrder(cell.confidenceLevel) >
        confidenceOrder(existing.confidenceLevel)
    ) {
      map.set(key, cell);
    }
  }

  return Array.from(map.values());
}

/**
 * PHASE 4: Generate coverage cells for a single GPS point (real-time grid update)
 * Returns CoverageCellEntity[] for a fresh point, used in explore.tsx for live grid animation.
 */
export function generateCellsFromPoint(
  sessionId: string,
  point: GpsPoint,
  cellSizeMeters: 1 | 2 = 1,
): CoverageCellEntity[] {
  if (!isValidPoint(point)) return [];

  const confidenceLevel = point.confidenceLevel ?? "LOW";
  const accuracyMeters = point.accuracyMeters ?? point.accuracy;
  const speedMps = point.speedMps ?? 0;

  const radius = calculateAdaptiveRadius({
    speedMps,
    accuracyMeters,
    confidenceLevel,
  });

  const cellIds = getAllCellsInRadius(
    point.lat,
    point.lon,
    radius,
    cellSizeMeters,
  );
  const cells: CoverageCellEntity[] = [];

  for (const cellId of cellIds) {
    const center = getCellCenter(cellId);
    cells.push({
      cellId,
      sessionId,
      centerLat: center.lat,
      centerLon: center.lon,
      cellSizeMeter: cellSizeMeters,
      radiusUsedMeters: radius,
      confidenceLevel,
      confidenceSource: `gps_accuracy_${accuracyMeters.toFixed(1)}m`,
      timestamp: point.timestamp,
    });
  }

  return cells;
}

export function getCellCenterForPoint(
  lat: number,
  lon: number,
  cellSizeMeters: 1 | 2,
): { lat: number; lon: number } {
  const { cellX, cellY } = calculateCellCoords(lat, lon, cellSizeMeters);
  return getCellCenter(coordsToCellId(cellX, cellY, cellSizeMeters));
}

function isValidPoint(point: GpsPoint): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Number.isFinite(point.timestamp)
  );
}
