// app/(tabs)/explore.tsx

import ClassifySheet from "@/src/components/ClassifySheet";
import { GpsIndicator } from "@/src/components/GpsIndicator";
import { MapType, MapTypeToggle } from "@/src/components/MapTypeToggle";
import SessionMap, { SessionMapHandle } from "@/src/components/SessionMap";
import Toast, { useToast } from "@/src/components/Toast";
import { COLORS } from "@/src/constants/colors";
import { useGps } from "@/src/hooks/useGps";
import { useSession } from "@/src/hooks/useSession";
import { useTimer } from "@/src/hooks/useTimer";
import {
  GpsPoint,
  MarkedEvent,
  sessionService,
} from "@/src/services/sessionService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s,
  ).padStart(2, "0")}`;
}

function makeId() {
  return Math.random().toString(36).slice(2, 11);
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const {
    session,
    setSession,
    isRunning,
    createSession,
    loadCurrentSession,
    addEvent,
    pause,
    resume,
    end,
    classify,
    refill,
  } = useSession();

  const {
    location,
    distance: liveDistance,
    isTracking,
    startTracking,
    stopTracking,
  } = useGps();

  const {
    elapsed,
    start: startTimer,
    stop: stopTimer,
    pause: pauseTimer,
    resume: resumeTimer,
  } = useTimer();

  const [toast, setToast] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MarkedEvent | null>(null);
  const [classifyVisible, setClassifyVisible] = useState(false);
  const [startGpsAccuracy, setStartGpsAccuracy] = useState<number | null>(null);
  const [redFilter, setRedFilter] = useState(false);
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);
  const [sessionMapType, setSessionMapType] = useState<MapType>("google");
  const sessionMapRef = useRef<SessionMapHandle>(null);
  const { showToast } = useToast();

  // ✅ Anti-race: protège les callbacks GPS contre un ancien sessionId
  const activeSessionIdRef = useRef<string | null>(null);

  // ✅ Source de vérité distance : session DB + live GPS delta
  const totalDistance = (session?.distance ?? 0) + liveDistance;

  // ✅ gpsTrace mémorisé
  const gpsTrace = useMemo(() => session?.gpsTrace ?? [], [session?.gpsTrace]);

  const userLocation = location
    ? {
        latitude: location.lat,
        longitude: location.lon,
        accuracy: location.accuracy,
        heading: location.bearingDeg,
      }
    : null;

  const canStartWithGps =
    startGpsAccuracy !== null && startGpsAccuracy <= 40 && !isRunning;

  const statusTop = StatusBar.currentHeight ?? insets.top;
  const mapHeaderTop = statusTop + 6;
  const mapHeaderHeight = 62;
  const mapControlsTop = mapHeaderTop + mapHeaderHeight + 14;
  const mapToastTop = mapHeaderTop + mapHeaderHeight + 10;

  const persistGpsPoint = useCallback(
    (targetSessionId: string, gpsPoint: GpsPoint) => {
      // ✅ Ignore si une autre session est devenue active
      if (activeSessionIdRef.current !== targetSessionId) return;

      setSession((prev) => {
        if (!prev || prev.id !== targetSessionId) return prev;

        const alreadyExists = prev.gpsTrace.some(
          (gp) =>
            gp.timestamp === gpsPoint.timestamp &&
            gp.lat === gpsPoint.lat &&
            gp.lon === gpsPoint.lon,
        );
        if (alreadyExists) return prev;

        return { ...prev, gpsTrace: [...prev.gpsTrace, gpsPoint] };
      });

      sessionService
        .addGpsPoint(targetSessionId, gpsPoint)
        .catch((err: unknown) => {
          console.warn("GPS point skipped:", err);
        });
    },
    [setSession],
  );

  // ✅ Handle start session
  const startSessionNow = useCallback(async () => {
    try {
      const newSession = await createSession();
      if (!newSession) return;

      activeSessionIdRef.current = newSession.id;

      startTracking((point) => persistGpsPoint(newSession.id, point));
      startTimer();
      setRedFilter(false);

      showToast("Session demarree ✓", "success");
    } catch (err: unknown) {
      console.error("Failed to start session:", err);
      showToast("Erreur demarrage session", "error");
    }
  }, [createSession, persistGpsPoint, showToast, startTracking, startTimer]);

  const handleStart = useCallback(() => {
    if (!canStartWithGps) {
      showToast("Signal GPS insuffisant", "error");
      return;
    }

    if (startGpsAccuracy !== null && startGpsAccuracy > 25) {
      Alert.alert(
        "Precision GPS faible",
        `Precision GPS faible (+/-${Math.round(startGpsAccuracy)}m). Continuer ?`,
        [
          { text: "Attendre meilleur signal", style: "cancel" },
          { text: "Demarrer quand meme", onPress: startSessionNow },
        ],
      );
      return;
    }

    void startSessionNow();
  }, [canStartWithGps, showToast, startGpsAccuracy, startSessionNow]);

  // ✅ Handle pause
  const handlePause = useCallback(() => {
    pause(totalDistance);
    pauseTimer();
    setToast("Session en pause");
  }, [pause, pauseTimer, totalDistance]);

  // ✅ Handle resume
  const handleResume = useCallback(() => {
    resume();
    resumeTimer();
    setToast("Session reprise");
  }, [resume, resumeTimer]);

  // ✅ Handle end session
  const handleEnd = useCallback(() => {
    Alert.alert("Terminer session?", "Cette action est irréversible.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Terminer",
        style: "destructive",
        onPress: async () => {
          try {
            activeSessionIdRef.current = null;

            await end(totalDistance, elapsed);
            stopTracking();
            stopTimer();
            setToast("Session terminée");
          } catch (err: unknown) {
            console.error("Failed to end session:", err);
            setToast("Erreur fermeture session");
          }
        },
      },
    ]);
  }, [end, stopTracking, stopTimer, totalDistance, elapsed]);

  // ✅ Handle add marker
  const handleAddMarker = useCallback(async () => {
    setToast(null);

    if (!session?.id || !location) {
      setToast("GPS non disponible");
      return;
    }

    try {
      const event: MarkedEvent = {
        id: makeId(),
        type: "manual",
        location: {
          lat: location.lat,
          lon: location.lon,
          accuracy: location.accuracy ?? 0,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      await addEvent(event);
      setToast("Marqueur ajouté");
    } catch (err: unknown) {
      console.error("Failed to add event:", err);
      setToast("Erreur ajout marqueur");
    }
  }, [session?.id, location, addEvent]);

  // ✅ Handle classify
  const handleClassify = useCallback(
    async (
      classification: string,
      notes?: string,
      photoScale?: MarkedEvent["photoScale"],
      photoUri?: string,
    ) => {
      if (!selectedEvent || !session?.id) return;

      try {
        await classify(
          selectedEvent.id,
          classification,
          notes,
          photoScale,
          photoUri,
        );
        setSelectedEvent(null);
        setClassifyVisible(false);
        setToast("Événement classé");
      } catch (err: unknown) {
        console.error("Failed to classify:", err);
        setToast("Erreur classification");
      }
    },
    [selectedEvent, session?.id, classify],
  );

  // ✅ Handle refill
  const handleRefill = useCallback(async () => {
    if (!selectedEvent || !session?.id) return;

    try {
      await refill(selectedEvent.id);
      setSelectedEvent(null);
      setClassifyVisible(false);
      setToast("Rebouchage enregistré");
    } catch (err: unknown) {
      console.error("Failed to refill:", err);
      setToast("Erreur rebouchage");
    }
  }, [selectedEvent, session?.id, refill]);

  // ✅ Handle event press
  const openClassify = useCallback((event: MarkedEvent) => {
    setSelectedEvent(event);
    setClassifyVisible(true);
  }, []);

  // ✅ Load current session on focus
  useFocusEffect(
    useCallback(() => {
      let active = true;

      loadCurrentSession()
        .then((current) => {
          if (!active || !current) return;

          const isActive =
            current.status === "active" || current.status === "running";

          if (!isActive) return;

          activeSessionIdRef.current = current.id;
          startTimer();
          startTracking((point) => persistGpsPoint(current.id, point));
        })
        .catch((err: unknown) => {
          console.error("ExploreScreen.loadCurrentSession error:", err);
          setToast("Erreur chargement session");
        });

      return () => {
        active = false;
        setToast(null);
      };
    }, [loadCurrentSession, persistGpsPoint, startTimer, startTracking]),
  );

  // ✅ View: No active session
  if (!session || session.status === "completed") {
    return (
      <View style={styles.container}>
        <View style={styles.idleBackdrop}>
          <View style={styles.radarCircleOuter} />
          <View style={styles.radarCircleMiddle} />
          <View style={styles.radarCircleInner} />
        </View>
        <ScrollView style={styles.emptyScroll} contentContainerStyle={[styles.emptyContent,{paddingTop: insets.top + 28,paddingBottom: Math.max(insets.bottom + 112, 128)}]} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyBrandHero}>
            <View style={styles.emptyLogoGlow}><Image source={require("@/assets/images/walksense-mark.png")} style={styles.emptyLogo} resizeMode="contain" /></View>
            <Text style={styles.emptyBrandTitle}>WalkSense</Text>
            <Text style={styles.emptyBrandSubtitle}>PROSPECTION · TERRAIN</Text>
          </View>
          <View style={styles.emptyCopyBlock}>
            <Text style={styles.emptyLead}>Tracez vos prospections terrain avec précision.</Text>
            <Text style={styles.emptySubcopy}>Sessions GPS, trouvailles et preuves locales, disponibles hors ligne.</Text>
          </View>
          <View style={styles.gpsCard}>
            <View style={styles.gpsBars}><View style={[styles.gpsBar, styles.gpsBarOne]} /><View style={[styles.gpsBar, styles.gpsBarTwo]} /><View style={[styles.gpsBar, styles.gpsBarThree]} /><View style={[styles.gpsBar, styles.gpsBarFour]} /><View style={[styles.gpsBar, styles.gpsBarFive]} /></View>
            <View style={styles.gpsCopy}><Text style={styles.gpsLabel}>Signal GPS</Text><Text style={styles.gpsValue}>{startGpsAccuracy !== null ? <>{Math.round(startGpsAccuracy)}m · {canStartWithGps ? "Bon" : "Faible"}</> : "Recherche du signal"}</Text></View>
            <Ionicons name="cellular" size={24} color={COLORS.primary} />
          </View>
          <GpsIndicator onAccuracyChange={setStartGpsAccuracy} />
          <TouchableOpacity style={[styles.startButton,!canStartWithGps && styles.startButtonDisabled]} onPress={handleStart} disabled={!canStartWithGps}>
            <Ionicons name="location" size={22} color="#1A1305" /><Text style={styles.startText}>DÉMARRER UNE SESSION</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ✅ View: Active session
  return (
    <View style={styles.container}>
      <View style={styles.activeMap}>
        <SessionMap ref={sessionMapRef} gpsTrace={gpsTrace} events={session.events ?? []} userLocation={userLocation} onEventPress={openClassify} mapType={sessionMapType} />
        <View style={[styles.mapHeader, { top: mapHeaderTop }]}>
          <Image source={require("@/assets/images/walksense-mark.png")} style={styles.activeHeaderLogo} resizeMode="contain" />
          <View style={styles.activeHeaderCopy}><Text style={styles.activeHeaderTitle}>Session terrain</Text><View style={styles.activeStatusRow}><View style={styles.liveDot} /><Text style={styles.activeStatusText}>{isRunning ? (isTracking ? "GPS actif" : "En cours") : "En pause"}</Text></View></View>
          <View style={styles.headerMapControls}><MapTypeToggle currentType={sessionMapType} onChange={setSessionMapType} compact /><TouchableOpacity style={[styles.headerMapControlButton, !userLocation && styles.headerMapControlDisabled]} onPress={() => sessionMapRef.current?.centerOnUser()} disabled={!userLocation}><Ionicons name="locate" size={18} color={userLocation ? COLORS.primary : COLORS.textTertiary} /></TouchableOpacity><TouchableOpacity style={styles.headerMapControlButton} onPress={() => sessionMapRef.current?.fitTrace()}><Ionicons name="expand-outline" size={18} color={COLORS.accent} /></TouchableOpacity></View>
        </View>
        <View style={styles.mapFade} />
      </View>
      <View style={[styles.activeSheet, panelsCollapsed && styles.activeSheetCollapsed, { paddingBottom: Math.max(insets.bottom, 8) + 78 }]}>
        <View style={styles.chronoCard}>
          <TouchableOpacity style={[styles.pauseOrb, !isRunning && styles.pauseOrbResume]} onPress={isRunning ? handlePause : handleResume}><Ionicons name={isRunning ? "pause" : "play"} size={30} color="#1A1305" /></TouchableOpacity>
          <View style={styles.chronoCopy}><Text style={styles.chronoLabel}>CHRONO</Text><Text style={styles.chronoValue}>{formatDuration(elapsed)}</Text><View style={styles.activeStatusRow}><View style={styles.liveDot} /><Text style={styles.activeStatusText}>{isRunning ? (isTracking ? "GPS actif" : "En cours") : "En pause"}</Text></View></View>
          <View style={styles.chronoDivider} />
          <View style={styles.metricGrid}><View style={styles.metricCell}><Ionicons name="arrow-forward" size={17} color={COLORS.primary} /><Text style={styles.metricLabel}>Distance</Text><Text style={styles.metricValue}>{Math.round(totalDistance)} m</Text></View><View style={styles.metricCell}><Ionicons name="locate" size={17} color={COLORS.primary} /><Text style={styles.metricLabel}>Précision</Text><Text style={styles.metricValue}>{location?.accuracy ? Math.round(location.accuracy) : "--"} m</Text></View></View>
        </View>
        <View style={styles.findsCard}>
          <View style={styles.findsHeader}><View><Text style={styles.findsTitle}>TROUVAILLES</Text><Text style={styles.findsCount}>{redFilter ? session.events.filter((e) => !e.classification).length : session.events.length} affichée{(redFilter ? session.events.filter((e) => !e.classification).length : session.events.length) > 1 ? "s" : ""}</Text></View><TouchableOpacity style={styles.addFindButton} onPress={handleAddMarker}><Ionicons name="add" size={24} color="#1A1305" /></TouchableOpacity></View>
          <View style={styles.findsList}>{(redFilter ? session.events.filter((e) => !e.classification) : session.events).slice(0, 3).map((event, index) => (<TouchableOpacity key={event.id} style={styles.findItem} onPress={() => openClassify(event)}><View style={styles.findIconBox}><Ionicons name="search" size={18} color={COLORS.accent} /></View><View style={styles.findCopy}><Text style={styles.findTitle} numberOfLines={1}>{event.classification || "Trouvaille non classée"}</Text><Text style={styles.findSubtitle} numberOfLines={1}>{event.notes || "Classification terrain à compléter"}</Text></View><Text style={styles.findBadge}>#{String(index + 1).padStart(2, "0")}</Text></TouchableOpacity>))}{session.events.length === 0 ? <Text style={styles.emptyFindsText}>Aucune trouvaille enregistrée</Text> : null}</View>
        </View>
        <View style={styles.bottomActions}><TouchableOpacity style={styles.ghostButton} onPress={isRunning ? handlePause : handleResume}><Text style={styles.ghostButtonText}>{isRunning ? "Pause" : "Reprendre"}</Text></TouchableOpacity><TouchableOpacity style={styles.dangerButton} onPress={handleEnd}><Text style={styles.dangerButtonText}>Terminer</Text></TouchableOpacity></View>
      </View>
      <View style={[styles.mapQuickActions, { top: mapControlsTop }]}><TouchableOpacity style={[styles.mapQuickActionButton, redFilter && styles.redFilterButtonActive]} onPress={() => setRedFilter(!redFilter)}><Ionicons name="filter" size={20} color={redFilter ? COLORS.background : COLORS.accent} /></TouchableOpacity><TouchableOpacity style={styles.mapQuickActionButton} onPress={() => setPanelsCollapsed((value) => !value)}><Ionicons name={panelsCollapsed ? "chevron-up" : "chevron-down"} size={20} color={COLORS.accent} /></TouchableOpacity></View>
      <ClassifySheet visible={classifyVisible} event={selectedEvent} onClose={() => setClassifyVisible(false)} onClassify={handleClassify} onRefill={handleRefill} />
      <Toast message={toast} onDone={() => setToast(null)} topOffset={mapToastTop} />
      {redFilter ? <View style={styles.redFilterOverlay} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  idleBackdrop: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", opacity: 0.55 },
  radarCircleOuter: { position: "absolute", width: 340, height: 340, borderRadius: 170, borderWidth: 1, borderColor: "rgba(212,175,55,0.30)" },
  radarCircleMiddle: { position: "absolute", width: 250, height: 250, borderRadius: 125, borderWidth: 1, borderColor: "rgba(212,175,55,0.36)" },
  radarCircleInner: { position: "absolute", width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: "rgba(212,175,55,0.42)" },
  emptyScroll: { flex: 1 },
  emptyContent: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 26, paddingHorizontal: 22 },
  emptyBrandHero: { alignItems: "center", gap: 8 },
  emptyLogoGlow: { width: 132, height: 132, alignItems: "center", justifyContent: "center", borderRadius: 34, shadowColor: "#D4AF37", shadowOpacity: 0.42, shadowRadius: 26, elevation: 14 },
  emptyLogo: { width: 120, height: 120, borderRadius: 24 },
  emptyBrandTitle: { color: "#D4AF37", fontSize: 32, lineHeight: 38, fontWeight: "900", textAlign: "center", textShadowColor: "rgba(212,175,55,0.55)", textShadowRadius: 16 },
  emptyBrandSubtitle: { color: "#B8B8B8", fontSize: 11, fontWeight: "900", letterSpacing: 3.5, textTransform: "uppercase" },
  emptyCopyBlock: { width: "100%", alignItems: "center", gap: 10 },
  emptyLead: { maxWidth: 330, color: "#F5F1E8", fontSize: 22, lineHeight: 29, fontWeight: "900", textAlign: "center" },
  emptySubcopy: { maxWidth: 330, color: "#B8B8B8", fontSize: 14, lineHeight: 21, fontWeight: "700", textAlign: "center" },
  gpsCard: { width: "100%", minHeight: 72, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: "rgba(80,230,78,0.28)", backgroundColor: "rgba(5,12,7,0.92)" },
  gpsBars: { width: 34, height: 34, flexDirection: "row", alignItems: "flex-end", gap: 3 },
  gpsBar: { width: 4, borderRadius: 3, backgroundColor: "#50E64E", shadowColor: "#50E64E", shadowOpacity: 0.7, shadowRadius: 7 },
  gpsBarOne: { height: 10 }, gpsBarTwo: { height: 15 }, gpsBarThree: { height: 21 }, gpsBarFour: { height: 28 }, gpsBarFive: { height: 34 },
  gpsCopy: { flex: 1 },
  gpsLabel: { color: "#B8B8B8", fontSize: 12, fontWeight: "900" },
  gpsValue: { marginTop: 3, color: "#50E64E", fontSize: 15, fontWeight: "900" },
  startButton: { alignSelf: "stretch", minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 18, borderRadius: 14, backgroundColor: "#D4AF37", shadowColor: "#D4AF37", shadowOpacity: 0.55, shadowRadius: 18, elevation: 9 },
  startButtonDisabled: { opacity: 0.42 },
  startText: { color: "#1A1305", fontSize: 15, fontWeight: "900", letterSpacing: 0.8, textAlign: "center" },
  activeMap: { position: "absolute", top: 0, left: 0, right: 0, height: 300, overflow: "hidden" },
  mapHeader: { position: "absolute", left: 12, right: 12, zIndex: 30, minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(2,7,4,0.92)", shadowColor: "#D4AF37", shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 },
  activeHeaderLogo: { width: 42, height: 42, borderRadius: 10 },
  activeHeaderCopy: { flex: 1, minWidth: 0 },
  activeHeaderTitle: { color: "#D4AF37", fontSize: 14, fontWeight: "900" },
  activeStatusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#50E64E", shadowColor: "#50E64E", shadowOpacity: 0.9, shadowRadius: 8 },
  activeStatusText: { color: "#B8B8B8", fontSize: 11, fontWeight: "800" },
  headerMapControls: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerMapControlButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 11, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(5,12,7,0.92)" },
  headerMapControlDisabled: { opacity: 0.42 },
  mapFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 90, backgroundColor: "rgba(5,5,5,0.58)" },
  activeSheet: { position: "absolute", top: 300, left: 0, right: 0, bottom: 0, gap: 12, paddingHorizontal: 14, paddingTop: 14, backgroundColor: "#050505" },
  activeSheetCollapsed: { top: 390 },
  chronoCard: { minHeight: 132, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(5,12,7,0.92)", shadowColor: "#D4AF37", shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 },
  pauseOrb: { width: 60, height: 60, alignItems: "center", justifyContent: "center", borderRadius: 30, borderWidth: 1, borderColor: "#D4AF37", backgroundColor: "#D4AF37", shadowColor: "#D4AF37", shadowOpacity: 0.55, shadowRadius: 18 },
  pauseOrbResume: { backgroundColor: "#50E64E", borderColor: "#50E64E", shadowColor: "#50E64E" },
  chronoCopy: { flex: 1, minWidth: 0 },
  chronoLabel: { color: "#D4AF37", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  chronoValue: { marginTop: 3, color: "#F5F1E8", fontSize: 32, lineHeight: 38, fontWeight: "900", fontVariant: ["tabular-nums"] },
  chronoDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(212,175,55,0.22)" },
  metricGrid: { width: 112, gap: 10 },
  metricCell: { gap: 2 },
  metricLabel: { color: "#B8B8B8", fontSize: 10, fontWeight: "800" },
  metricValue: { color: "#F5F1E8", fontSize: 13, fontWeight: "900", fontVariant: ["tabular-nums"] },
  findsCard: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(80,230,78,0.28)", backgroundColor: "rgba(5,12,7,0.92)" },
  findsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  findsTitle: { color: "#D4AF37", fontSize: 14, fontWeight: "900", letterSpacing: 1.1 },
  findsCount: { marginTop: 3, color: "#B8B8B8", fontSize: 12, fontWeight: "800" },
  addFindButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#D4AF37", shadowColor: "#D4AF37", shadowOpacity: 0.45, shadowRadius: 14 },
  findsList: { gap: 8 },
  findItem: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10 },
  findIconBox: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(212,175,55,0.06)" },
  findCopy: { flex: 1, minWidth: 0 },
  findTitle: { color: "#F5F1E8", fontSize: 14, fontWeight: "900" },
  findSubtitle: { marginTop: 2, color: "#B8B8B8", fontSize: 12, fontWeight: "700" },
  findBadge: { color: "#D4AF37", fontSize: 12, fontWeight: "900" },
  emptyFindsText: { color: "#787268", fontSize: 13, fontWeight: "800", textAlign: "center", paddingVertical: 10 },
  bottomActions: { flexDirection: "row", gap: 10 },
  ghostButton: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(212,175,55,0.06)" },
  ghostButtonText: { color: "#F5F1E8", fontSize: 14, fontWeight: "900" },
  dangerButton: { flex: 1, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#E5484D", shadowColor: "#E5484D", shadowOpacity: 0.45, shadowRadius: 14 },
  dangerButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  mapQuickActions: { position: "absolute", right: 14, zIndex: 46, elevation: 15, alignItems: "center", gap: 10 },
  mapQuickActionButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.32)", backgroundColor: "rgba(2,7,4,0.92)" },
  redFilterButtonActive: { backgroundColor: "#D4AF37" },
  redFilterOverlay: { ...StyleSheet.absoluteFillObject, pointerEvents: "none", backgroundColor: "rgba(180,0,0,0.18)" },
  control: { flex: 1, height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  controlText: { color: "white", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
});
