/**
 * SignalMeter Component
 * Affiche une barre de signal BLE en 5 niveaux
 */

import { COLORS } from "@/src/constants/colors";
import React from "react";
import { StyleSheet, View } from "react-native";

interface SignalMeterProps {
  value: number; // 0-100
  size?: "small" | "large";
}

export default function SignalMeter({
  value,
  size = "large",
}: SignalMeterProps) {
  const bars = 5;
  const filledBars = Math.ceil((value / 100) * bars);

  const getBarColor = (index: number) => {
    if (index < filledBars) {
      if (filledBars >= 4) return COLORS.accent;
      if (filledBars >= 3) return "oklch(72% 0.16 70)";
      if (filledBars >= 2) return "oklch(62% 0.15 30)";
      return "oklch(60% 0.18 28)";
    }
    return "rgba(0, 0, 0, 0.15)";
  };

  const isSmall = size === "small";
  const barWidth = isSmall ? 2 : 3;
  const barHeight = isSmall ? 10 : 14;
  const gap = isSmall ? 1 : 2;

  return (
    <View
      style={[
        styles.container,
        {
          gap,
          height: barHeight + (isSmall ? 0 : 4),
        },
      ]}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              width: barWidth,
              height: barHeight - i * (isSmall ? 2 : 3),
              backgroundColor: getBarColor(i),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 18,
  },

  bar: {
    borderRadius: 1,
  },
});
