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
  controlsTopOffset?: number;
}

export default function GlobalMap({ traces, userLocation }: GlobalMapProps) {
  const totalPoints = traces.reduce((sum, t) => sum + t.points.length, 0);
  const totalEvents = traces.reduce((sum, t) => sum + t.events.length, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      {traces.length === 0 ? (
        <>
          <Text style={styles.label}>Aucune session enregistrée</Text>
          <Text style={styles.sub}>
            Les données de session sont disponibles ici une fois enregistrées.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.label}>
            {traces.length} session(s) détectée(s)
          </Text>
          <Text style={styles.sub}>
            {totalPoints} points GPS · {totalEvents} marqueur
            {totalEvents > 1 ? "s" : ""}
          </Text>
          <View style={styles.traceList}>
            {traces.map((trace, index) => (
              <View key={trace.sessionId} style={styles.traceRow}>
                <Text style={styles.traceName}>Session {index + 1}</Text>
                <Text style={styles.traceMeta}>
                  {trace.points.length} pts · {trace.events.length} marqueur
                  {trace.events.length > 1 ? "s" : ""}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      {userLocation ? (
        <Text style={styles.location}>
          Position : {userLocation.latitude.toFixed(5)},{" "}
          {userLocation.longitude.toFixed(5)}
        </Text>
      ) : null}
      <Text style={styles.note}>
        Ouvrez la liste des sessions pour choisir celles à afficher.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: 8,
  },
  icon: { fontSize: 48 },
  label: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textSecondary },
  location: { fontSize: 12, color: COLORS.info },
  traceList: {
    width: "100%",
    marginTop: 14,
    paddingHorizontal: 10,
  },
  traceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  traceName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  traceMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  note: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 260,
  },
});
