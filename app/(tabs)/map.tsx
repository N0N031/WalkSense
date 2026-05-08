import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlobalMap, { SessionTrace } from "@/src/components/GlobalMap";
import { COLORS } from "@/src/constants/colors";
import { Session, sessionService } from "@/src/services/sessionService";

const PALETTE = [
  "#D4AF37",
  "#4FC3F7",
  "#81C784",
  "#F48FB1",
  "#FFB74D",
  "#CE93D8",
];

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      sessionService
        .getSessions()
        .then((all) => {
          if (active) setSessions(all);
        })
        .catch((err) => console.error("MapScreen getSessions error:", err));
      return () => {
        active = false;
      };
    }, []),
  );

  const traces: SessionTrace[] = sessions.map((session, index) => ({
    sessionId: session.id,
    points: session.gpsTrace,
    events: session.events,
    color: PALETTE[index % PALETTE.length],
    active:
      session.status === "active" ||
      session.status === "running" ||
      session.status === "paused",
  }));

  const completed = sessions.filter((s) => s.status === "completed");
  const totalDist = sessions.reduce((sum, s) => sum + (s.distance ?? 0), 0);
  const totalEvents = sessions.reduce((sum, s) => sum + s.events.length, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completed.length}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDist(totalDist)}</Text>
          <Text style={styles.statLabel}>Distance totale</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalEvents}</Text>
          <Text style={styles.statLabel}>Marqueurs</Text>
        </View>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={52} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Aucun passage enregistré</Text>
          <Text style={styles.emptyText}>
            Démarrez une session terrain pour tracer votre prospection.
          </Text>
        </View>
      ) : (
        <GlobalMap traces={traces} userLocation={null} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
