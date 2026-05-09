import BrandLogo from "@/src/components/BrandLogo";
import ClassifySheet from "@/src/components/ClassifySheet";
import { GpsIndicator } from "@/src/components/GpsIndicator";
import SessionBottomSheet from "@/src/components/SessionBottomSheet";
import SessionHud from "@/src/components/SessionHud";
import SessionMap from "@/src/components/SessionMap";
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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ImageBackground,
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
  const [initialDistance, setInitialDistance] = useState(0);
  const [startGpsAccuracy, setStartGpsAccuracy] = useState<number | null>(null);
  const [redFilter, setRedFilter] = useState(false);
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);
  const { showToast } = useToast();

  const sessionId = session?.id;
  const totalDistance = initialDistance + liveDistance;
  const gpsTrace = useMemo(() => session?.gpsTrace ?? [], [session?.gpsTrace]);
  const userLocation = location
    ? { latitude: location.lat, longitude: location.lon }
    : null;
  const canStartWithGps =
    startGpsAccuracy !== null && startGpsAccuracy <= 40 && !isRunning;

  // ✅ EFFECT: Update coverage cells when GPS point arrives
  useEffect(() => {
    if (!sessionId || !isRunning || !location) return;

    const gpsPoint: GpsPoint = {
      lat: location.lat,
      lon: location.lon,
      accuracy: location.accuracy || 0,
      timestamp: Date.now(),
    };

    setSession((prev) => {
      if (!prev || prev.id !== sessionId) return prev;

      // Avoid duplicates
      const alreadyExists = prev.gpsTrace.some(
        (gp) =>
          gp.timestamp === gpsPoint.timestamp &&
          gp.lat === gpsPoint.lat &&
          gp.lon === gpsPoint.lon,
      );
      if (alreadyExists) return prev;

      return { ...prev, gpsTrace: [...prev.gpsTrace, gpsPoint] };
    });

    // Persist to DB asynchronously (non-blocking)
    sessionService.addGpsPoint(sessionId, gpsPoint).catch((err) => {
      console.warn("GPS point skipped:", err);
    });
  }, [location, sessionId, setSession, isRunning]);

  // ✅ Handle start session
  const startSessionNow = useCallback(async () => {
    try {
      await createSession();
      startTracking();
      startTimer();
      setInitialDistance(0);
      setRedFilter(false);
      showToast("Session demarree ✓", "success");
    } catch (err) {
      console.error("Failed to start session:", err);
      showToast("Erreur demarrage session", "error");
    }
  }, [createSession, showToast, startTracking, startTimer]);

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
    pause();
    pauseTimer();
    setToast("Session en pause");
  }, [pause, pauseTimer]);

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
            await end(totalDistance, elapsed);
            stopTracking();
            stopTimer();
            setToast("Session terminée");
          } catch (err) {
            console.error("Failed to end session:", err);
            setToast("Erreur fermeture session");
          }
        },
      },
    ]);
  }, [end, stopTracking, stopTimer, totalDistance, elapsed]);

  // ✅ Handle add marker
  const handleAddMarker = useCallback(async () => {
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
    } catch (err) {
      console.error("Failed to add event:", err);
      setToast("Erreur ajout marqueur");
    }
  }, [session?.id, location, addEvent]);

  // ✅ Handle classify
  const handleClassify = useCallback(
    async (classification: string, notes?: string) => {
      if (!selectedEvent || !session?.id) return;

      try {
        await classify(selectedEvent.id, classification, notes);
        setSelectedEvent(null);
        setClassifyVisible(false);
        setToast("Événement classé");
      } catch (err) {
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
    } catch (err) {
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
          const activeSession =
            current.status === "active" || current.status === "running";
          if (activeSession) {
            setInitialDistance(current.distance ?? 0);
            startTimer();
            startTracking();
          }
        })
        .catch((err) => {
          console.error("ExploreScreen.loadCurrentSession error:", err);
          setToast("Erreur chargement session");
        });
      return () => {
        active = false;
      };
    }, [loadCurrentSession, startTimer, startTracking]),
  );

  // ✅ View: No active session
  if (!session || session.status === "completed") {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require("@/assets/images/walksense-splash-bg.png")}
          resizeMode="cover"
          style={styles.emptyBackground}
        >
          <View style={styles.emptyOverlay} />
          <ScrollView
            style={styles.emptyScroll}
            contentContainerStyle={[
              styles.emptyContent,
              {
                paddingTop: insets.top + 12,
                paddingBottom: Math.max(insets.bottom + 104, 120),
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emptyBrand}>
              <BrandLogo compact />
              <View style={styles.emptyBrandCopy}>
                <Text
                  style={styles.emptyBrandTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  WalkSense
                </Text>
                <Text
                  style={styles.emptyBrandSubtitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  TERRAIN TRACKING
                </Text>
              </View>
            </View>

            <View style={styles.emptyDivider}>
              <View style={styles.emptyDividerLine} />
              <View style={styles.emptyDividerDot} />
              <View style={styles.emptyDividerLine} />
            </View>

            <BrandLogo size="large" />

            <View style={styles.emptyCopyBlock}>
              <Text
                style={styles.emptyLead}
                numberOfLines={3}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Tracez vos prospections terrain avec précision.
              </Text>
              <Text
                style={styles.emptySubcopy}
                numberOfLines={3}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                Enregistrez chaque découverte et restez organisé.
              </Text>
            </View>

            <GpsIndicator onAccuracyChange={setStartGpsAccuracy} />

            <TouchableOpacity
              style={[
                styles.startButton,
                !canStartWithGps && styles.startButtonDisabled,
              ]}
              onPress={handleStart}
              disabled={!canStartWithGps}
            >
              <Ionicons name="location" size={25} color={COLORS.accent} />
              <Text
                style={styles.startText}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                DÉMARRER UNE SESSION
              </Text>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={COLORS.accent}
              />
            </TouchableOpacity>
          </ScrollView>
        </ImageBackground>
      </View>
    );
  }

  // ✅ View: Active session
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mapHeader,
          { top: insets.top + (StatusBar.currentHeight ?? 0) + 8 },
        ]}
      >
        <View style={styles.brandRow}>
          <BrandLogo compact />
          <View>
            <Text style={styles.brandTitle}>WalkSense</Text>
            <Text style={styles.brandSubtitle}>Tracking & Exploration</Text>
          </View>
        </View>
        <View style={styles.mapModeButton}>
          <Ionicons name="map-outline" size={22} color={COLORS.accent} />
          <Text style={styles.mapModeText}>Carte</Text>
        </View>
      </View>
      <View style={panelsCollapsed ? styles.mapAreaExpanded : styles.mapArea}>
        <SessionMap
          gpsTrace={gpsTrace}
          events={session.events ?? []}
          userLocation={userLocation}
          onEventPress={openClassify}
        />
      </View>

      {!panelsCollapsed ? (
        <SessionHud
          time={formatDuration(elapsed)}
          distance={totalDistance}
          gpsAccuracy={location?.accuracy}
          isRunning={isRunning}
        />
      ) : null}

      <TouchableOpacity
        style={[
          styles.redFilterButton,
          { top: insets.top + (StatusBar.currentHeight ?? 0) + 8 },
          redFilter && styles.redFilterButtonActive,
        ]}
        onPress={() => setRedFilter(!redFilter)}
      >
        <Ionicons name="filter" size={20} color={COLORS.accent} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.collapseButton,
          {
            top: panelsCollapsed
              ? insets.top + (StatusBar.currentHeight ?? 0) + 148
              : insets.top + (StatusBar.currentHeight ?? 0) + 200,
          },
        ]}
        onPress={() => setPanelsCollapsed((value) => !value)}
      >
        <Ionicons
          name={panelsCollapsed ? "chevron-up" : "chevron-down"}
          size={20}
          color={COLORS.accent}
        />
      </TouchableOpacity>

      {!panelsCollapsed ? (
        <SessionBottomSheet
          events={session.events}
          onAddMarker={handleAddMarker}
          onEventPress={openClassify}
        />
      ) : (
        <View
          style={[
            styles.compactDock,
            { bottom: Math.max(insets.bottom, 8) + 156 },
          ]}
        >
          <TouchableOpacity
            style={styles.compactAction}
            onPress={handleAddMarker}
          >
            <Ionicons name="add" size={24} color={COLORS.primary} />
            <Text style={styles.compactActionText}>
              {session.events.length}
            </Text>
          </TouchableOpacity>
          <View style={styles.compactMetric}>
            <Ionicons
              name={isTracking ? "navigate" : "navigate-outline"}
              size={18}
              color={isTracking ? COLORS.primary : COLORS.textTertiary}
            />
            <Text style={styles.compactMetricText}>
              {location?.accuracy
                ? `GPS ${Math.round(location.accuracy)}m`
                : "GPS --"}
            </Text>
          </View>
        </View>
      )}

      <View
        style={[
          panelsCollapsed ? styles.controlsFloating : styles.controls,
          panelsCollapsed
            ? {
                bottom: Math.max(insets.bottom, 8) + 76,
                paddingBottom: 12,
              }
            : {
                marginBottom: Math.max(insets.bottom, 8) + 64,
                paddingBottom: 12,
              },
        ]}
      >
        {isRunning ? (
          <ControlButton
            icon="pause"
            label="Pause"
            color={COLORS.warning}
            onPress={handlePause}
          />
        ) : (
          <ControlButton
            icon="play"
            label="Reprendre"
            color={COLORS.success}
            onPress={handleResume}
          />
        )}
        <ControlButton
          icon="stop"
          label="Terminer"
          color={COLORS.error}
          onPress={handleEnd}
        />
      </View>

      <ClassifySheet
        visible={classifyVisible}
        event={selectedEvent}
        onClose={() => setClassifyVisible(false)}
        onClassify={handleClassify}
        onRefill={handleRefill}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
      {redFilter ? <View style={styles.redFilterOverlay} /> : null}
    </View>
  );
}

interface ControlButtonProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  onPress: () => void;
}

function ControlButton({ icon, label, color, onPress }: ControlButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.control, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color="white" />
      <Text style={styles.controlText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapHeader: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.10)",
    shadowColor: COLORS.orPremium,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  brandTitle: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: "800",
  },
  brandSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  mapModeButton: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.glassStrong,
  },
  mapModeText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  mapArea: {
    flex: 3,
    overflow: "hidden",
  },
  mapAreaExpanded: {
    flex: 1,
    overflow: "hidden",
  },
  emptyBackground: {
    flex: 1,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },
  emptyScroll: {
    flex: 1,
  },
  emptyContent: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyBrand: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  emptyBrandCopy: {
    flexShrink: 1,
    maxWidth: 260,
  },
  emptyBrandTitle: {
    color: COLORS.accent,
    fontSize: 30,
    fontWeight: "900",
  },
  emptyBrandSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: 4,
  },
  emptyDivider: {
    width: "62%",
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  emptyDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(137, 255, 63, 0.42)",
  },
  emptyDividerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.glowGreen,
    shadowColor: COLORS.glowGreen,
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
  emptyCopyBlock: {
    width: "100%",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  emptyLead: {
    color: COLORS.text,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: "900",
    textAlign: "center",
    width: "100%",
    maxWidth: 350,
    flexShrink: 1,
  },
  emptySubcopy: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
    maxWidth: 330,
    flexShrink: 1,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    alignSelf: "stretch",
    minHeight: 60,
    marginHorizontal: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(26, 58, 26, 0.82)",
    borderWidth: 1,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.36,
    shadowRadius: 18,
  },
  startButtonDisabled: {
    opacity: 0.42,
  },
  startText: {
    flex: 1,
    color: COLORS.accent,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
    flexShrink: 1,
  },
  controls: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.glassStrong,
  },
  controlsFloating: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingVertical: 12,
  },
  redFilterButton: {
    position: "absolute",
    right: 14,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.glassStrong,
    shadowColor: COLORS.glowGreen,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  redFilterButtonActive: {
    backgroundColor: COLORS.accent,
  },
  collapseButton: {
    position: "absolute",
    right: 14,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.glassStrong,
    shadowColor: COLORS.orPremium,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  compactDock: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 104,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.glassStrong,
  },
  compactAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactActionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  compactMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactMetricText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  redFilterOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
    backgroundColor: "rgba(180, 0, 0, 0.28)",
  },
  control: {
    flex: 1,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  controlText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
