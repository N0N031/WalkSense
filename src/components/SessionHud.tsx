import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import { formatDistanceMeters } from "@/src/utils/format";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface SessionHudProps {
  time: string;
  distance: number;
  gpsAccuracy?: number | null;
  signal: number;
  battery: number;
  isRunning: boolean;
}

export default function SessionHud({
  time,
  distance,
  gpsAccuracy,
  signal,
  battery,
  isRunning,
}: SessionHudProps) {
  return (
    <View style={styles.container}>
      <View style={styles.timerSection}>
        <Text style={styles.timerLabel}>CHRONO</Text>
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
        <Metric
          icon="radio"
          label="SIG"
          value={`${Math.round(signal)}%`}
          color={COLORS.accent}
        />
        <Metric
          icon="battery-half"
          label="BAT"
          value={`${Math.round(battery)}%`}
          color={battery > 20 ? COLORS.success : COLORS.error}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 14,
  },
  timerSection: {
    minWidth: 118,
  },
  timerLabel: {
    color: COLORS.textTertiary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 2,
  },
  timerValue: {
    color: COLORS.accent,
    fontFamily: "monospace",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: 1,
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
    height: 44,
    backgroundColor: COLORS.border,
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
    fontSize: 12,
    fontWeight: "700",
  },
  metricLabel: {
    color: COLORS.textTertiary,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
