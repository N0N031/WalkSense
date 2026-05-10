import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GlobalMap, { SessionTrace } from "@/src/components/GlobalMap";
import PremiumHeader from "@/src/components/PremiumHeader";
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
  accuracy?: number;
} | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") return null;

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? undefined,
  };
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleSessionIds, setVisibleSessionIds] = useState<string[] | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const [data, position] = await Promise.all([
        sessionService.getSessions(),
        loadUserLocation(),
      ]);
      const sorted = [...data].sort((a, b) => b.startTime - a.startTime);
      setSessions(sorted);
      setVisibleSessionIds((current) =>
        current === null ? sorted.map((session) => session.id) : current,
      );
      setUserLocation(position);
    } catch (error) {
      console.error("MapScreen.loadSessions error:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions]),
  );

  const visibleSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          visibleSessionIds === null || visibleSessionIds.includes(session.id),
      ),
    [sessions, visibleSessionIds],
  );

  const traces = useMemo<SessionTrace[]>(
    () =>
      visibleSessions.map((session, index) => ({
        sessionId: session.id,
        points: session.gpsTrace,
        events: session.events,
        color: TRACE_COLORS[index % TRACE_COLORS.length],
        active: session.status === "active" || session.status === "running",
      })),
    [visibleSessions],
  );

  const totalDistance = visibleSessions.reduce(
    (sum, session) => sum + session.distance,
    0,
  );
  const totalEvents = visibleSessions.reduce(
    (sum, session) => sum + session.events.length,
    0,
  );
  const totalPoints = visibleSessions.reduce(
    (sum, session) => sum + session.gpsTrace.length,
    0,
  );
  const visibleSessionsCount = visibleSessions.length;

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <GlobalMap
          traces={traces}
          userLocation={userLocation}
          controlsTopOffset={(StatusBar.currentHeight ?? insets.top) + 116}
        />
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : null}
        {!loading ? (
          <View
            pointerEvents="none"
            style={[
              styles.passageLegend,
              { bottom: Math.max(insets.bottom, 8) + 82 },
            ]}
          >
            <Text style={styles.passageLegendTitle}>Passages</Text>
            <Text style={styles.passageLegendText}>
              {visibleSessionsCount} session
              {visibleSessionsCount > 1 ? "s" : ""} visible
              {totalPoints > 0 ? ` · ${totalPoints} points` : ""}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.header,
          { top: (StatusBar.currentHeight ?? insets.top) + 6 },
        ]}
      >
        <PremiumHeader
          style={styles.headerBrand}
          rightContent={
            <TouchableOpacity
              style={styles.sessionsButtonInline}
              onPress={() => setDrawerOpen(true)}
              activeOpacity={0.82}
            >
              <Ionicons name="list-outline" size={22} color={COLORS.accent} />
            </TouchableOpacity>
          }
        />
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>
            {visibleSessionsCount}/{sessions.length} session
            {sessions.length !== 1 ? "s" : ""} ·{" "}
            {totalEvents === 0
              ? "Aucun marqueur"
              : `${totalEvents} marqueur${totalEvents > 1 ? "s" : ""}`}
          </Text>
          <Text style={styles.distance}>
            {formatDistanceMeters(totalDistance)}
          </Text>
        </View>
      </View>

      <SessionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSessionsToggle={setVisibleSessionIds}
        selectedSessionIds={visibleSessionIds}
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
    left: "3%",
    right: "3%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.22)",
    backgroundColor: "rgba(4, 10, 6, 0.82)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 12,
    gap: 8,
  },
  headerBrand: {
    width: "100%",
  },
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  statsText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  distance: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  sessionsButtonInline: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.28)",
    backgroundColor: "rgba(212, 175, 55, 0.10)",
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
  passageLegend: {
    position: "absolute",
    left: 16,
    maxWidth: "70%",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.24)",
    backgroundColor: "rgba(4, 10, 6, 0.82)",
  },
  passageLegendTitle: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "900",
  },
  passageLegendText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});
