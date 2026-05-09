import { COLORS } from "@/src/constants/colors";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface GpsIndicatorProps {
  onAccuracyChange?: (accuracy: number) => void;
}

export interface GpsLevel {
  accuracy: number | null;
  level: "CRITICAL" | "MAUVAIS" | "FAIBLE" | "BON";
  canStart: boolean;
}

function getGpsLevel(accuracy: number | null): GpsLevel {
  if (accuracy === null) {
    return {
      accuracy,
      level: "CRITICAL",
      canStart: false,
    };
  }

  if (accuracy <= 25) {
    return {
      accuracy,
      level: "BON",
      canStart: true,
    };
  }

  if (accuracy <= 40) {
    return {
      accuracy,
      level: "FAIBLE",
      canStart: false,
    };
  }

  if (accuracy <= 60) {
    return {
      accuracy,
      level: "MAUVAIS",
      canStart: false,
    };
  }

  return {
    accuracy,
    level: "CRITICAL",
    canStart: false,
  };
}

function getBarCount(accuracy: number | null): number {
  if (accuracy === null) return 1;
  if (accuracy <= 15) return 5;
  if (accuracy <= 25) return 4;
  if (accuracy <= 40) return 3;
  if (accuracy <= 60) return 2;
  return 1;
}

export function GpsIndicator({ onAccuracyChange }: GpsIndicatorProps) {
  const [gpsLevel, setGpsLevel] = useState<GpsLevel>(getGpsLevel(null));
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    async function startWatch() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted || status !== "granted") {
        if (mounted) setGpsLevel(getGpsLevel(null));
        return;
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0,
        },
        (location) => {
          const now = Date.now();
          if (now - lastUpdateRef.current < 1000) return;
          lastUpdateRef.current = now;

          const accuracy = location.coords.accuracy ?? 100;
          setGpsLevel(getGpsLevel(accuracy));
          onAccuracyChange?.(accuracy);
        },
      );
    }

    startWatch().catch(() => {
      if (mounted) setGpsLevel(getGpsLevel(null));
    });

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [onAccuracyChange]);

  const color = GPS_COLORS[gpsLevel.level];
  const count = getBarCount(gpsLevel.accuracy);
  const bars = useMemo(
    () => Array.from({ length: 5 }, (_, index) => index < count),
    [count],
  );

  return (
    <View style={styles.container}>
      <View style={styles.bars}>
        {bars.map((filled, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                backgroundColor: filled ? color : "rgba(184, 184, 184, 0.30)",
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>GPS</Text>
      <Text style={styles.accuracy}>
        {gpsLevel.accuracy === null
          ? "--"
          : `+/-${Math.round(gpsLevel.accuracy)}m`}
      </Text>
      <Text style={[styles.level, { color }]}>{gpsLevel.level}</Text>
    </View>
  );
}

const GPS_COLORS: Record<GpsLevel["level"], string> = {
  BON: COLORS.primary,
  FAIBLE: COLORS.warning,
  MAUVAIS: "#F97316",
  CRITICAL: COLORS.error,
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(82, 224, 79, 0.18)",
    backgroundColor: "rgba(5, 12, 7, 0.92)",
  },
  bars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  bar: {
    width: 8,
    height: 16,
    borderRadius: 2,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  accuracy: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    minWidth: 48,
  },
  level: {
    fontSize: 12,
    fontWeight: "900",
  },
});
