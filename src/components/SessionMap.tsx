import { COLORS } from "@/src/constants/colors";
import type { CoverageCellEntity } from "@/src/data/gridEntities";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface SessionMapProps {
  gpsTrace: GpsPoint[];
  userLocation: { latitude: number; longitude: number } | null;
  events: MarkedEvent[];
  onEventPress: (event: MarkedEvent) => void;
  historicalTraces?: GpsPoint[][];
  coverageCells?: CoverageCellEntity[];
  showGrid?: boolean;
}

export default function SessionMap({
  events,
  userLocation,
  coverageCells = [],
  showGrid = true,
}: SessionMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.label}>Carte GPS</Text>
      <Text style={styles.sub}>Non disponible sur cette plateforme</Text>
      {userLocation ? (
        <Text style={styles.location}>
          Position: {userLocation.latitude.toFixed(5)},{" "}
          {userLocation.longitude.toFixed(5)}
        </Text>
      ) : null}
      {events.length > 0 && (
        <Text style={styles.count}>{events.length} marqueur(s)</Text>
      )}
      {showGrid && coverageCells.length > 0 ? (
        <Text style={styles.count}>{coverageCells.length} cellule(s)</Text>
      ) : null}
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
  location: {
    fontSize: 12,
    color: COLORS.info,
  },
  count: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
});
