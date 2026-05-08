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
import React, { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
    error: gpsError,
    distance: liveDistance,
    startTracking,
    stopTracking,
    resetGps,
  } = useGps();
  const {
    elapsed,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    syncElapsed,
  } = useTimer();
  const [toast, setToast] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MarkedEvent | null>(null);
  const [classifyVisible, setClassifyVisible] = useState(false);
  const [initialDistance, setInitialDistance] = useState(0);
  const [redFilter, setRedFilter] = useState(false);
  const [coverageCells, setCoverageCells] = useState<CoverageCellEntity[]>([]);
  const [showGrid, setShowGrid] = useState(true);

  const totalDistance = initialDistance + liveDistance;
  const gpsTrace = session?.gpsTrace ?? [];
  const userLocation = location
    ? { latitude: location.lat, longitude: location.lon }
    : null;

  // ✅ SINGLE EFFECT: Load grid data (persisted or preview)
  useEffect(() => {
    if (!session || session.status !== "running") return;

    let active = true;

    async function loadGrid() {
      if (!session?.id) {
        setCoverageCells([]);
        return;
      }

      // PHASE 1 : Display real-time buffer first
      if (session.coverageCells && session.coverageCells.length > 0) {
        if (active) {
          setCoverageCells(session.coverageCells.slice(0, GRID_DISPLAY_LIMIT));
        }
        return;
      }

      try {
        // PHASE 2 : Try to load persisted cells from DB
        const persisted = await sessionRepository.getCoverageCellsBySession(
          session.id,
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
          const preview = generateCoverageFromTrajectory(previewPoints);
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
  }, [session?.id, session?.coverageCells, gpsTrace]);

  // ✅ EFFECT: Update coverage cells when GPS point arrives
  useEffect(() => {
    if (!session?.id || session.status !== "running" || !location) return;

    const gpsPoint: GpsPoint = {
      id: makeId(),
      sessionId: session.id,
      lat: location.lat,
      lon: location.lon,
      accuracy: location.accuracy || 0,
      timestamp: Date.now(),
    };

    setSession((prev) => {
      if (!prev || prev.id !== session.id) return prev;

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
          const affectedCells = generateCellsFromPoint(session.id, gpsPoint, 1);

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
    sessionService.addGpsPoint(session.id, gpsPoint).catch((err) => {
      console.error("GPS persistence error:", err);
      setToast("Erreur sauvegarde GPS");
    });
  }, [location, session?.id, session?.status]);

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
            await end();
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
  }, [end, stopTracking, stopTimer]);

  // ✅ Handle add marker
  const handleAddMarker = useCallback(async () => {
    if (!session?.id || !location) {
      setToast("GPS non disponible");
      return;
    }

    try {
      const event: MarkedEvent = {
        id: makeId(),
        sessionId: session.id,
        type: "manual",
        lat: location.lat,
        lon: location.lon,
        timestamp: Date.now(),
        classified: false,
        classification: null,
        notes: null,
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
      loadCurrentSession();
    }, [loadCurrentSession]),
  );

  // ✅ View: No active session
  if (!session || session.status === "closed") {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <BrandLogo size="large" />
          <Text style={styles.title}>RockSense</Text>
          <Text style={styles.subtitle}>
            Tracez vos prospections terrain avec précision. Enregistrez chaque
            découverte et restez organisé.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Ionicons name="location" size={20} color={COLORS.text} />
            <Text style={styles.startText}>Démarrer prospection</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ✅ View: Active session
  return (
    <View style={styles.container}>
      <SessionMap
        gpsTrace={gpsTrace}
        events={session.events ?? []}
        userLocation={userLocation}
        coverageCells={coverageCells}
        showGrid={showGrid}
        onEventPress={openClassify}
      />

      <SessionHud
        elapsed={elapsed}
        distance={totalDistance}
        accuracy={location?.accuracy}
        signalLevel={3}
        batteryLevel={95}
      />

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

      <SessionBottomSheet
        events={session.events}
        onAddMarker={handleAddMarker}
        onEventPress={openClassify}
      />

      <View
        style={[
          styles.controls,
          { paddingBottom: Math.max(insets.bottom, 12) },
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
      <Toast message={toast || gpsError} onDone={() => setToast(null)} />
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
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 18,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 36,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    alignSelf: "stretch",
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: COLORS.verdProfond,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  startText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
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
    backgroundColor: COLORS.cardBackground,
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
    backgroundColor: COLORS.cardBackground,
  },
  gridToggleButtonActive: {
    backgroundColor: COLORS.accent,
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
    borderRadius: 14,
  },
  controlText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
