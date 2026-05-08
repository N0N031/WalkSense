import type { GpsPoint } from "@/src/services/sessionService";
import {
  generateCoverageFromTrajectory,
  getAllCellsInRadius,
} from "@/src/services/GridService";
import { getCellCenter } from "@/src/services/GpsQualityService";
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
}
