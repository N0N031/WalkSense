import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import { formatDistanceMeters } from "@/src/utils/format";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface SessionHudProps {
  time: string;
  distance: number;
  gpsAccuracy?: number | null;
  isRunning: boolean;
}

export default function SessionHud({
  time,
  distance,
  gpsAccuracy,
  isRunning,
}: SessionHudProps) {
  return (
    <View style={styles.container}>
      <View style={styles.timerSection}>
        <Text style={styles.timerLabel}>CHRONO</Text>
        <View style={styles.actionCircle}>
          <Ionicons
            name={isRunning ? "pause" : "play"}
            size={26}
            color={COLORS.accent}
          />
        </View>
        <Text style={styles.timerValue}>{time}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isRunning ? COLORS.primary : COLORS.warning },
            ]}
          />
          <Text style={styles.statusText}>
            {isRunning ? "En cours" : "Pause"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricsSection}>
        <Metric
          icon="navigate"
          label="DIST"
          value={formatDistanceMeters(distance)}
          color={COLORS.primary}
        />
        <Metric
          icon="locate"
          label="GPS"
          value={gpsAccuracy ? `±${gpsAccuracy.toFixed(0)}m` : "--"}
          color={COLORS.info}
        />
      </View>
    </View>
  );
}

interface MetricProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  color: string;
}

function Metric({ icon, label, value, color }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    marginTop: 14,
    marginBottom: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: COLORS.glassStrong,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 14,
    gap: 18,
  },
  timerSection: {
    minWidth: 112,
    alignItems: "flex-start",
  },
  timerLabel: {
    color: COLORS.textTertiary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 2,
  },
  actionCircle: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 38,
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: "rgba(0, 0, 0, 0.30)",
  },
  timerValue: {
    color: COLORS.text,
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 72,
    backgroundColor: COLORS.divider,
  },
  metricsSection: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  metric: {
    alignItems: "center",
    gap: 3,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    color: COLORS.textTertiary,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
