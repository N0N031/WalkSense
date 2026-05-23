import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GlobalMap, { SessionTrace } from "@/src/components/GlobalMap";
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
      </View>

      <View style={[styles.header, { top: (StatusBar.currentHeight ?? insets.top) + 42 }]}>
        <Image source={require("@/assets/images/walksense-mark.png")} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>WalkSense</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {visibleSessionsCount}/{sessions.length} sessions · {totalEvents} trouvaille{totalEvents > 1 ? "s" : ""}
          </Text>
        </View>
        <Text style={styles.distance}>{formatDistanceMeters(totalDistance)}</Text>
        <TouchableOpacity style={styles.sessionsButtonInline} onPress={() => setDrawerOpen(true)} activeOpacity={0.82}>
          <Ionicons name="list-outline" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <View style={[styles.rightRail, { top: (StatusBar.currentHeight ?? insets.top) + 132 }]}>
        <TouchableOpacity style={styles.railButton} onPress={() => setDrawerOpen(true)}><Ionicons name="layers-outline" size={20} color={COLORS.accent} /></TouchableOpacity>
        <TouchableOpacity style={styles.railButton} onPress={loadSessions}><Ionicons name="locate" size={20} color={COLORS.primary} /></TouchableOpacity>
        <TouchableOpacity style={styles.railButton} onPress={() => setDrawerOpen(true)}><Ionicons name="expand-outline" size={20} color={COLORS.accent} /></TouchableOpacity>
      </View>

      {!loading ? (
        <View pointerEvents="none" style={[styles.passageLegend, { bottom: Math.max(insets.bottom, 8) + 82 }]}>
          <View>
            <Text style={styles.passageLegendTitle}>PASSAGES</Text>
            <Text style={styles.passageLegendText}>{visibleSessionsCount} sessions · {totalPoints} points</Text>
          </View>
          <View style={styles.legendLines}><View style={styles.legendLineGreen} /><View style={styles.legendLineGoldStrong} /><View style={styles.legendLineGoldSoft} /></View>
        </View>
      ) : null}

      {drawerOpen ? (
        <View style={[styles.drawer, { paddingBottom: Math.max(insets.bottom, 8) + 18 }]}>
          <View style={styles.drawerHandle} />
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerTitle}>Sessions visibles</Text>
              <Text style={styles.drawerSubtitle}>{visibleSessionsCount}/{sessions.length} traces affichées</Text>
            </View>
            <TouchableOpacity style={styles.drawerClose} onPress={() => setDrawerOpen(false)}><Ionicons name="close" size={20} color={COLORS.accent} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.drawerList} contentContainerStyle={styles.drawerListContent} showsVerticalScrollIndicator={false}>
            {sessions.map((session, index) => {
              const active = visibleSessionIds === null || visibleSessionIds.includes(session.id);
              return (
                <TouchableOpacity key={session.id} style={styles.drawerItem} onPress={() => setVisibleSessionIds((current) => {
                  const selected = current ?? sessions.map((item) => item.id);
                  return selected.includes(session.id) ? selected.filter((id) => id !== session.id) : [...selected, session.id];
                })}>
                  <View style={[styles.drawerCheck, active && styles.drawerCheckActive]}>{active ? <Ionicons name="checkmark" size={16} color="#050505" /> : null}</View>
                  <View style={[styles.drawerColorBar, { backgroundColor: TRACE_COLORS[index % TRACE_COLORS.length] }]} />
                  <View style={styles.drawerItemCopy}>
                    <Text style={styles.drawerItemTitle} numberOfLines={1}>{session.commune?.trim() || "Session terrain"}</Text>
                    <Text style={styles.drawerItemMeta} numberOfLines={1}>{formatDistanceMeters(session.distance)} · {session.gpsTrace.length} points · {session.events.length} trouvailles</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.drawerFooter}>
            <TouchableOpacity style={styles.ghostButton} onPress={() => setVisibleSessionIds([])}><Text style={styles.ghostButtonText}>Tout masquer</Text></TouchableOpacity>
            <TouchableOpacity style={styles.goldButton} onPress={() => setVisibleSessionIds(sessions.map((session) => session.id))}><Text style={styles.goldButtonText}>Tout afficher</Text></TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  map: { flex: 1, overflow: "hidden" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5,5,5,0.34)" },
  header: { position: "absolute", left: 12, right: 12, minHeight: 74, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(2,7,4,0.92)", shadowColor: "#D4AF37", shadowOpacity: 0.18, shadowRadius: 18, elevation: 12 },
  headerLogo: { width: 42, height: 42, borderRadius: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: "#D4AF37", fontSize: 15, fontWeight: "900" },
  headerSubtitle: { marginTop: 3, color: "#B8B8B8", fontSize: 11, fontWeight: "800" },
  distance: { color: "#D4AF37", fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] },
  sessionsButtonInline: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(212,175,55,0.06)" },
  rightRail: { position: "absolute", right: 14, gap: 10 },
  railButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(2,7,4,0.92)", shadowColor: "#000", shadowOpacity: 0.26, shadowRadius: 12, elevation: 8 },
  passageLegend: { position: "absolute", left: 14, right: 14, minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: "rgba(80,230,78,0.28)", backgroundColor: "rgba(2,7,4,0.92)" },
  passageLegendTitle: { color: "#D4AF37", fontSize: 11, fontWeight: "900", letterSpacing: 1.6 },
  passageLegendText: { color: "#B8B8B8", fontSize: 12, fontWeight: "800", marginTop: 3 },
  legendLines: { width: 72, gap: 5 },
  legendLineGreen: { height: 3, borderRadius: 2, backgroundColor: "#50E64E" },
  legendLineGoldStrong: { height: 3, borderRadius: 2, backgroundColor: "rgba(212,175,55,0.8)" },
  legendLineGoldSoft: { height: 3, borderRadius: 2, backgroundColor: "rgba(212,175,55,0.4)" },
  drawer: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "62%", paddingTop: 10, paddingHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(2,7,4,0.96)", shadowColor: "#000", shadowOpacity: 0.36, shadowRadius: 22, elevation: 16 },
  drawerHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: "#D4AF37", marginBottom: 14 },
  drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  drawerTitle: { color: "#F5F1E8", fontSize: 21, fontWeight: "900" },
  drawerSubtitle: { marginTop: 3, color: "#B8B8B8", fontSize: 12, fontWeight: "800" },
  drawerClose: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(212,175,55,0.06)" },
  drawerList: { maxHeight: 260 },
  drawerListContent: { gap: 10, paddingBottom: 12 },
  drawerItem: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: "rgba(80,230,78,0.18)", backgroundColor: "rgba(5,12,7,0.70)" },
  drawerCheck: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 7, borderWidth: 1, borderColor: "rgba(80,230,78,0.44)", backgroundColor: "rgba(255,255,255,0.04)" },
  drawerCheckActive: { backgroundColor: "#50E64E", shadowColor: "#50E64E", shadowOpacity: 0.75, shadowRadius: 10 },
  drawerColorBar: { width: 6, alignSelf: "stretch", borderRadius: 4 },
  drawerItemCopy: { flex: 1, minWidth: 0 },
  drawerItemTitle: { color: "#F5F1E8", fontSize: 14, fontWeight: "900" },
  drawerItemMeta: { marginTop: 3, color: "#B8B8B8", fontSize: 11, fontWeight: "700" },
  drawerFooter: { flexDirection: "row", gap: 10, paddingTop: 8 },
  ghostButton: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(212,175,55,0.06)" },
  ghostButtonText: { color: "#F5F1E8", fontSize: 13, fontWeight: "900" },
  goldButton: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#D4AF37", shadowColor: "#D4AF37", shadowOpacity: 0.48, shadowRadius: 14 },
  goldButtonText: { color: "#1A1305", fontSize: 13, fontWeight: "900" },
});
