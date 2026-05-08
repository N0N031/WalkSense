import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GlobalMap, { SessionTrace } from "@/src/components/GlobalMap";
import { COLORS } from "@/src/constants/colors";
import { sessionService, Session } from "@/src/services/sessionService";
import { formatDistanceMeters } from "@/src/utils/format";

const TRACE_COLORS = [
  COLORS.gpsTrace,
  COLORS.primary,
  COLORS.info,
  COLORS.warning,
  COLORS.markerFind,
];

async function loadUserLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadSessions() {
        setLoading(true);
        try {
          const [data, position] = await Promise.all([
            sessionService.getSessions(),
            loadUserLocation(),
          ]);
          if (active) {
            setSessions(data);
            setUserLocation(position);
          }
        } catch (error) {
          console.error("MapScreen.loadSessions error:", error);
          if (active) setSessions([]);
        } finally {
          if (active) setLoading(false);
        }
      }

      loadSessions();
      return () => {
        active = false;
      };
    }, []),
  );

  const traces = useMemo<SessionTrace[]>(
    () =>
      sessions.map((session, index) => ({
        sessionId: session.id,
        points: session.gpsTrace,
        events: session.events,
        color: TRACE_COLORS[index % TRACE_COLORS.length],
        active: session.status === "active" || session.status === "running",
      })),
    [sessions],
  );

  const totalDistance = sessions.reduce(
    (sum, session) => sum + session.distance,
    0,
  );
  const totalEvents = sessions.reduce(
    (sum, session) => sum + session.events.length,
    0,
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Carte</Text>
          <Text style={styles.subtitle}>
            {sessions.length} sessions · {totalEvents} marqueurs
          </Text>
        </View>
        <Text style={styles.distance}>{formatDistanceMeters(totalDistance)}</Text>
      </View>

      <View style={styles.map}>
        <GlobalMap traces={traces} userLocation={userLocation} />
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : null}
      </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  distance: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "800",
  },
  map: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 15, 15, 0.3)",
  },
});
