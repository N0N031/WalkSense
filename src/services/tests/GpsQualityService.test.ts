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
}
