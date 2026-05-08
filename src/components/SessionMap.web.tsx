import { COLORS } from "@/src/constants/colors";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface SessionMapProps {
  gpsTrace: GpsPoint[];
  userLocation: { latitude: number; longitude: number } | null;
  events: MarkedEvent[];
  onEventPress: (event: MarkedEvent) => void;
  historicalTraces?: GpsPoint[][];
}

export default function SessionMap({ events }: SessionMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.label}>Carte GPS</Text>
      <Text style={styles.sub}>Non disponible sur le Web</Text>
      {events.length > 0 && (
        <Text style={styles.count}>{events.length} marqueur(s)</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 3,
    backgroundColor: "#f0ede5",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    fontSize: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  sub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  count: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
});
