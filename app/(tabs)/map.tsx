import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GlobalMap, { SessionTrace } from "@/src/components/GlobalMap";
import { SessionDrawer } from "@/src/components/SessionDrawer";
import { COLORS } from "@/src/constants/colors";
import { Session, sessionService } from "@/src/services/sessionService";
import { formatDistanceMeters } from "@/src/utils/format";

const TRACE_COLORS = [
  COLORS.gpsTrace,
  COLORS.primary,
  COLORS.info,
  COLORS.warning,
  COLORS.markerFind,
  "#A78BFA",
  "#22D3EE",
  "#FB7185",
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleSessionIds, setVisibleSessionIds] = useState<string[] | null>(null);
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
            setVisibleSessionIds((current) =>
              current === null ? data.map((session) => session.id) : current,
            );
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
      sessions
        .filter(
          (session) =>
            visibleSessionIds === null || visibleSessionIds.includes(session.id),
        )
        .map((session, index) => ({
          sessionId: session.id,
          points: session.gpsTrace,
          events: session.events,
          color: TRACE_COLORS[index % TRACE_COLORS.length],
          active: session.status === "active" || session.status === "running",
        })),
    [sessions, visibleSessionIds],
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
    <View style={styles.container}>
      <View style={styles.map}>
        <GlobalMap
          traces={traces}
          userLocation={userLocation}
          controlsTopOffset={insets.top + 110}
          controlsBottomOffset={insets.bottom + 96}
        />
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : null}
      </View>

      <View style={[styles.header, { top: insets.top + 12 }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Carte</Text>
          <Text style={styles.subtitle}>
            {sessions.length} sessions ·{" "}
            {totalEvents === 0
              ? "Aucun evenement"
              : `${totalEvents} marqueur${totalEvents > 1 ? "s" : ""}`}
          </Text>
        </View>
        <Text style={styles.distance}>{formatDistanceMeters(totalDistance)}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.drawerButton,
          { bottom: Math.max(insets.bottom, 8) + 106 },
        ]}
        onPress={() => setDrawerOpen(true)}
      >
        <Ionicons name="list" size={22} color={COLORS.background} />
      </TouchableOpacity>

      <SessionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSessionsToggle={setVisibleSessionIds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    position: "absolute",
    left: 24,
    right: 24,
    maxHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.glassStrong,
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
    textAlign: "right",
    minWidth: 72,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  map: {
    flex: 1,
    overflow: "hidden",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 15, 15, 0.3)",
  },
  drawerButton: {
    position: "absolute",
    right: 22,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent,
  },
});
