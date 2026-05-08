import { COLORS } from "@/src/constants/colors";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface SessionTrace {
  sessionId: string;
  points: GpsPoint[];
  events: MarkedEvent[];
  color: string;
  active: boolean;
}

export interface GlobalMapProps {
  traces: SessionTrace[];
  userLocation: { latitude: number; longitude: number } | null;
}

export default function GlobalMap({ traces }: GlobalMapProps) {
  const totalPoints = traces.reduce((sum, t) => sum + t.points.length, 0);
  const totalEvents = traces.reduce((sum, t) => sum + t.events.length, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.label}>{traces.length} session(s)</Text>
      <Text style={styles.sub}>
        {totalPoints} points GPS · {totalEvents} marqueurs
      </Text>
      <Text style={styles.note}>Carte non disponible sur cette plateforme</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0ede5",
    gap: 8,
  },
  icon: { fontSize: 48 },
  label: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textSecondary },
  note: { fontSize: 11, color: COLORS.textTertiary, marginTop: 4 },
});
