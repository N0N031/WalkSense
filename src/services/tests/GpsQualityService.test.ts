import {
  calculateAdaptiveRadius,
  calculateCellId,
  calculateConfidenceLevel,
} from "@/src/services/GpsQualityService";

function expectEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function expectBetween(
  actual: number,
  min: number,
  max: number,
  label: string,
): void {
  if (actual < min || actual > max) {
    throw new Error(`${label}: expected ${actual} between ${min} and ${max}`);
  }
}

export function runGpsQualityServiceTests(): void {
  expectEqual(
    calculateConfidenceLevel({ accuracyMeters: 3, pointAgeMs: 9999 }),
    "HIGH",
    "HIGH threshold",
  );
  expectEqual(
    calculateConfidenceLevel({ accuracyMeters: 3, pointAgeMs: 10000 }),
    "MEDIUM",
    "stale HIGH becomes MEDIUM",
  );
  expectEqual(
    calculateConfidenceLevel({ accuracyMeters: 6 }),
    "MEDIUM",
    "MEDIUM threshold",
  );
  expectEqual(
    calculateConfidenceLevel({ accuracyMeters: 6.1 }),
    "LOW",
    "LOW threshold",
  );

  expectBetween(
    calculateAdaptiveRadius({
      speedMps: 0,
      accuracyMeters: 2,
      confidenceLevel: "HIGH",
    }),
    1,
    1.2,
    "HIGH radius",
  );
  expectEqual(
    calculateAdaptiveRadius({
      speedMps: 1,
      accuracyMeters: 8,
      confidenceLevel: "LOW",
    }),
    2,
    "LOW radius",
  );

  const idA = calculateCellId(45.123456, 2.456789, 1);
  const idB = calculateCellId(45.123456, 2.456789, 1);
  expectEqual(idA, idB, "deterministic cell id");
}
