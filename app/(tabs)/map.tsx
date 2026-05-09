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
  const [visibleSessionIds, setVisibleSessionIds] = useState<string[] | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const [data, position] = await Promise.all([
        sessionService.getSessions(),
        loadUserLocation(),
      ]);
      setSessions(data);
      setVisibleSessionIds((current) =>
        current === null ? data.map((session) => session.id) : current,
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

  const traces = useMemo<SessionTrace[]>(
    () =>
      sessions
        .filter(
          (session) =>
            visibleSessionIds === null ||
            visibleSessionIds.includes(session.id),
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
          controlsTopOffset={(StatusBar.currentHeight ?? insets.top) + 116}
          controlsBottomOffset={insets.bottom + 96}
        />
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.accent} />
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
              style={styles.drawerButtonInline}
              onPress={() => setDrawerOpen(true)}
            >
              <Ionicons name="layers-outline" size={22} color={COLORS.accent} />
            </TouchableOpacity>
          }
        />
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} ·{" "}
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
  drawerButtonInline: {
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
});
