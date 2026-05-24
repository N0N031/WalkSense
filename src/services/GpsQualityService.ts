import type { ConfidenceLevel } from "@/src/data/gridEntities";

export interface GpsQualityParams {
  accuracyMeters: number;
  speedMps?: number;
  pointAgeMs?: number;
  trajectoryStability?: number;
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
