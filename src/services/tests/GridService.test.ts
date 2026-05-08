import { getCellCenter } from "@/src/services/GpsQualityService";
import {
    deduplicateCells,
    generateCoverageFromTrajectory,
    getAllCellsInRadius,
} from "@/src/services/GridService";
import type { GpsPoint } from "@/src/services/sessionService";
import { haversineMeters } from "@/src/utils/distance";

function expect(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(label);
  }
}

export async function runGridServiceTests(): Promise<void> {
  const point: GpsPoint = {
    lat: 45.123456,
    lon: 2.456789,
    accuracy: 2,
    accuracyMeters: 2,
    speedMps: 0,
    confidenceLevel: "HIGH",
    timestamp: 1000,
  };

  const cells = await generateCoverageFromTrajectory({
    sessionId: "test-session",
    gpsPoints: [point, point],
    cellSizeMeters: 1,
  });

  const uniqueIds = new Set(cells.map((cell) => cell.cellId));
  expect(cells.length === uniqueIds.size, "coverage cells are deduplicated");
  expect(cells.length > 0, "coverage includes at least one cell");

  const affected = getAllCellsInRadius(point.lat, point.lon, 1.2, 1);
  expect(affected.length > 0, "affected cells generated");
  for (const cellId of affected) {
    const center = getCellCenter(cellId);
    expect(
      haversineMeters(point.lat, point.lon, center.lat, center.lon) <= 1.2,
      "affected cell center is inside radius",
    );
  }

  // PHASE 4 : Test deduplicateCells
  const cellsToDedup = [
    {
      cellId: "A1",
      sessionId: "test",
      centerLat: 45.0,
      centerLon: 2.0,
      cellSizeMeter: 1,
      radiusUsedMeters: 1,
      confidenceLevel: "LOW" as const,
      confidenceSource: "test_low",
      timestamp: 1000,
    },
    {
      cellId: "A1",
      sessionId: "test",
      centerLat: 45.0,
      centerLon: 2.0,
      cellSizeMeter: 1,
      radiusUsedMeters: 1.5,
      confidenceLevel: "HIGH" as const,
      confidenceSource: "test_high",
      timestamp: 1001,
    },
    {
      cellId: "B2",
      sessionId: "test",
      centerLat: 45.1,
      centerLon: 2.1,
      cellSizeMeter: 1,
      radiusUsedMeters: 1,
      confidenceLevel: "MEDIUM" as const,
      confidenceSource: "test_medium",
      timestamp: 1002,
    },
  ];

  const result = deduplicateCells(cellsToDedup);
  expect(result.length === 2, "deduplicateCells returns unique cellIds");

  const a1 = result.find((c) => c.cellId === "A1");
  expect(a1?.confidenceLevel === "HIGH", "keeps highest confidence for A1");

  const b2 = result.find((c) => c.cellId === "B2");
  expect(b2?.confidenceLevel === "MEDIUM", "keeps single cell B2");
}
