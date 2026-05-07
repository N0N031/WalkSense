/**
 * TopHud Component
 * Affiche le chrono, GPS, signal détecteur et batterie en haut de l'écran
 */

import { COLORS } from "@/src/constants/colors";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import SignalMeter from "./SignalMeter";

interface TopHudProps {
  time: string; // "HH:MM:SS"
  gpsAccuracy: number | null;
  satellites: number;
  bleSignal: number; // 0-100
  bleBattery: number; // 0-100
  deviceConnected: boolean;
  onMenuPress?: () => void;
}

export default function TopHud({
  time,
  gpsAccuracy,
  satellites,
  bleSignal,
  bleBattery,
  deviceConnected,
  onMenuPress,
}: TopHudProps) {
  return (
    <View style={styles.container}>
      {/* Timer */}
      <View style={styles.timerBox}>
        <Text style={styles.timerLabel}>CHRONO</Text>
        <Text style={styles.timerValue}>{time}</Text>
      </View>

      {/* GPS Status */}
      <View style={styles.statusBox}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>GPS</Text>
          <View style={styles.satelliteRow}>
            <Text style={styles.satelliteValue}>{satellites}</Text>
            <Text style={styles.satelliteUnit}>SAT</Text>
          </View>
          {gpsAccuracy !== null && (
            <Text style={styles.accuracyText}>±{gpsAccuracy.toFixed(1)}m</Text>
          )}
        </View>

        {/* Signal Meter */}
        {deviceConnected && (
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>SIGNAL</Text>
            <SignalMeter value={bleSignal} size="small" />
            <Text style={styles.signalText}>{bleSignal}%</Text>
          </View>
        )}

        {/* Battery */}
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>BATTERIE</Text>
          <View style={styles.batteryBox}>
            <View
              style={[
                styles.batteryFill,
                {
                  width: `${bleBattery}%`,
                  backgroundColor:
                    bleBattery > 20 ? COLORS.accent : "oklch(60% 0.18 28)",
                },
              ]}
            />
          </View>
          <Text style={styles.batteryText}>{bleBattery}%</Text>
        </View>
      </View>

      {/* Menu button */}
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
        <Text style={styles.menuIcon}>⋮</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(20, 21, 15, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(10px)",
  },

  timerBox: {
    marginRight: 12,
  },

  timerLabel: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },

  timerValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "monospace",
  },

  statusBox: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },

  statusItem: {
    alignItems: "center",
    gap: 4,
  },

  statusLabel: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  satelliteRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },

  satelliteValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "monospace",
  },

  satelliteUnit: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 7,
    fontWeight: "600",
  },

  accuracyText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 7,
    fontFamily: "monospace",
  },

  signalText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },

  batteryBox: {
    width: 24,
    height: 6,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },

  batteryFill: {
    height: "100%",
    borderRadius: 2,
  },

  batteryText: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 8,
    fontFamily: "monospace",
    fontWeight: "600",
  },

  menuButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  menuIcon: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 18,
    fontWeight: "700",
  },
});
