import BrandLogo from "@/src/components/BrandLogo";
import ClassifySheet from "@/src/components/ClassifySheet";
import SessionBottomSheet from "@/src/components/SessionBottomSheet";
import SessionHud from "@/src/components/SessionHud";
import SessionMap from "@/src/components/SessionMap";
import Toast from "@/src/components/Toast";
import { COLORS } from "@/src/constants/colors";
import type { CoverageCellEntity } from "@/src/data/gridEntities";
import { sessionRepository } from "@/src/data/sessionRepository";
import { useGps } from "@/src/hooks/useGps";
import { useSession } from "@/src/hooks/useSession";
import { useTimer } from "@/src/hooks/useTimer";
import {
  deduplicateCells,
  generateCellsFromPoint,
  generateCoverageFromTrajectory,
} from "@/src/services/GridService";
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

const GRID_DISPLAY_LIMIT = 100;
const GRID_PREVIEW_POINT_LIMIT = 100;

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
  const [redFilter, setRedFilter] = useState(false);
  const [coverageCells, setCoverageCells] = useState<CoverageCellEntity[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [panelsCollapsed, setPanelsCollapsed] = useState(false);

  const sessionId = session?.id;
  const sessionCoverageCells = session?.coverageCells;
  const totalDistance = initialDistance + liveDistance;
  const gpsTrace = useMemo(() => session?.gpsTrace ?? [], [session?.gpsTrace]);
  const userLocation = location
    ? { latitude: location.lat, longitude: location.lon }
    : null;

  // ✅ SINGLE EFFECT: Load grid data (persisted or preview)
  useEffect(() => {
    if (!sessionId || !isRunning) return;

    let active = true;

    async function loadGrid() {
      if (!sessionId) {
        setCoverageCells([]);
        return;
      }

      // PHASE 1 : Display real-time buffer first
      if (sessionCoverageCells && sessionCoverageCells.length > 0) {
        if (active) {
          setCoverageCells(sessionCoverageCells.slice(0, GRID_DISPLAY_LIMIT));
        }
        return;
      }

      try {

        const persisted = await sessionRepository.getCoverageCellsBySession(
          sessionId,
          GRID_DISPLAY_LIMIT,
        );

        if (!active) return;

        if (persisted.length > 0) {
          setCoverageCells(persisted);
          return;
        }

        // PHASE 3: Generate preview from last N GPS points
        const previewPoints = gpsTrace.slice(-GRID_PREVIEW_POINT_LIMIT);
        if (previewPoints.length > 0) {
          const preview = await generateCoverageFromTrajectory({
            sessionId,
            gpsPoints: previewPoints,
          });
          if (active) {
            setCoverageCells(preview.slice(0, GRID_DISPLAY_LIMIT));
          }
        }
      } catch (err) {
        console.warn("Failed to load coverage cells:", err);
        if (active) setCoverageCells([]);
      }
    }

    loadGrid();

    return () => {
      active = false;
    };
  }, [sessionId, sessionCoverageCells, gpsTrace, isRunning]);

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

      // Add GPS point
      const updated = { ...prev, gpsTrace: [...prev.gpsTrace, gpsPoint] };

      // ✅ PHASE 4: Real-time grid calculation with throttling
      try {
        const now = Date.now();
        const lastUpdate = updated.lastGridUpdateMs || 0;

        // Check throttle: only update if enough time has passed
        if (now - lastUpdate > updated.gridUpdateInterval) {
          // Calculate cells from fresh point only
          const affectedCells = generateCellsFromPoint(sessionId, gpsPoint, 1);

          // Merge + deduplicate in memory
          const merged = deduplicateCells([
            ...updated.coverageCells,
            ...affectedCells,
          ]);

          // Limit to 100 cells in memory
          updated.coverageCells = merged.slice(0, 100);
          updated.lastGridUpdateMs = now;
        }
      } catch (err) {
        console.warn("Grid realtime calc error:", err);
        // Continue without blocking GPS trace
      }

      return updated;
    });

    // Persist to DB asynchronously (non-blocking)
    sessionService.addGpsPoint(sessionId, gpsPoint).catch((err) => {
      console.warn("GPS point skipped:", err);
    });
  }, [location, sessionId, setSession, isRunning]);

  // ✅ Handle start session
  const handleStart = useCallback(async () => {
    try {
      await createSession();
      startTracking();
      startTimer();
      setInitialDistance(0);
      setRedFilter(false);
      setShowGrid(true);
      setToast("Session démarrée");
    } catch (err) {
      console.error("Failed to start session:", err);
      setToast("Erreur démarrage session");
    }
  }, [createSession, startTracking, startTimer]);

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
              <View>
                <Text style={styles.emptyBrandTitle}>WalkSense</Text>
                <Text style={styles.emptyBrandSubtitle}>TERRAIN TRACKING</Text>
              </View>
            </View>

            <View style={styles.emptyDivider}>
              <View style={styles.emptyDividerLine} />
              <View style={styles.emptyDividerDot} />
              <View style={styles.emptyDividerLine} />
            </View>

            <BrandLogo size="large" />

            <View style={styles.emptyCopyBlock}>
              <Text style={styles.emptyLead}>
                Tracez vos prospections terrain avec précision.
              </Text>
              <Text style={styles.emptySubcopy}>
                Enregistrez chaque découverte et restez organisé.
              </Text>
            </View>

            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Ionicons name="location" size={25} color={COLORS.accent} />
              <Text style={styles.startText}>DÉMARRER UNE SESSION</Text>
              <Ionicons name="chevron-forward" size={22} color={COLORS.accent} />
            </TouchableOpacity>

            <View style={styles.gpsStatusCard}>
              <View style={styles.gpsStatusIcon}>
                <Ionicons name="radio-outline" size={28} color={COLORS.primary} />
              </View>
              <View style={styles.gpsStatusText}>
                <Text style={styles.gpsStatusTitle}>
                  Signal GPS en cours d’acquisition…
                </Text>
                <Text style={styles.gpsStatusSubtitle}>
                  Veuillez patienter quelques instants
                </Text>
              </View>
              <View style={styles.gpsStatusDot} />
            </View>
          </ScrollView>
        </ImageBackground>
      </View>
    );
  }

  // ✅ View: Active session
  return (
    <View style={styles.container}>
      <View style={[styles.mapHeader, { top: insets.top + 12 }]}>
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
          coverageCells={coverageCells}
          showGrid={showGrid}
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
          redFilter && styles.redFilterButtonActive,
        ]}
        onPress={() => setRedFilter(!redFilter)}
      >
        <Ionicons name="filter" size={20} color={COLORS.accent} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.gridToggleButton,
          { top: 160 },
          showGrid && styles.gridToggleButtonActive,
        ]}
        onPress={() => setShowGrid(!showGrid)}
      >
        <Ionicons
          name="grid"
          size={20}
          color={showGrid ? "white" : COLORS.accent}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.collapseButton,
          { top: panelsCollapsed ? 160 : 212 },
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
          <TouchableOpacity style={styles.compactAction} onPress={handleAddMarker}>
            <Ionicons name="add" size={24} color={COLORS.primary} />
            <Text style={styles.compactActionText}>{session.events.length}</Text>
          </TouchableOpacity>
          <View style={styles.compactMetric}>
            <Ionicons
              name={isTracking ? "navigate" : "navigate-outline"}
              size={18}
              color={isTracking ? COLORS.primary : COLORS.textTertiary}
            />
            <Text style={styles.compactMetricText}>
              {location?.accuracy ? `GPS ${Math.round(location.accuracy)}m` : "GPS --"}
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
    left: 18,
    right: 18,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  brandTitle: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: "900",
  },
  brandSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  mapModeButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  emptyBrandTitle: {
    color: COLORS.accent,
    fontSize: 32,
    fontWeight: "900",
  },
  emptyBrandSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 5,
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
    alignItems: "center",
    gap: 14,
  },
  emptyLead: {
    color: COLORS.text,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center",
    width: "88%",
  },
  emptySubcopy: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    textAlign: "center",
    width: "88%",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    alignSelf: "stretch",
    minHeight: 62,
    marginHorizontal: 32,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(26, 58, 26, 0.82)",
    borderWidth: 1,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.36,
    shadowRadius: 18,
  },
  startText: {
    flex: 1,
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  gpsStatusCard: {
    width: "100%",
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(82, 224, 79, 0.18)",
    backgroundColor: "rgba(5, 12, 7, 0.92)",
  },
  gpsStatusIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(82, 224, 79, 0.08)",
  },
  gpsStatusText: {
    flex: 1,
  },
  gpsStatusTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  gpsStatusSubtitle: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  gpsStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.glowGreen,
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
    top: 92,
    right: 14,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.glassStrong,
  },
  redFilterButtonActive: {
    backgroundColor: COLORS.accent,
  },
  gridToggleButton: {
    position: "absolute",
    right: 14,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.glassStrong,
  },
  gridToggleButtonActive: {
    backgroundColor: COLORS.accent,
  },
  collapseButton: {
    position: "absolute",
    right: 14,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.glassStrong,
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
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  controlText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
