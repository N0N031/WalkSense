import { calculateConfidenceLevel } from "@/src/services/GpsQualityService";

function expectEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
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
  expectEqual(
    calculateConfidenceLevel({ accuracyMeters: 0 }),
    "HIGH",
    "accuracy=0 should be HIGH",
  );
  expectEqual(
    calculateConfidenceLevel({ accuracyMeters: 999 }),
    "LOW",
    "very poor GPS accuracy (999m) should be LOW",
  );
  expectEqual(
    calculateConfidenceLevel({ accuracyMeters: 3, pointAgeMs: 0 }),
    "HIGH",
    "age=0 should be HIGH",
  );
  expectEqual(
    calculateConfidenceLevel({ accuracyMeters: 3, speedMps: 10 }),
    "HIGH",
    "speedMps present but ignored should be HIGH",
  );
  expectEqual(
    calculateConfidenceLevel({ accuracyMeters: 3, trajectoryStability: 0.9 }),
    "HIGH",
    "trajectoryStability present but ignored should be HIGH",
  );
}
