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
import { formatDistanceMeters } from "@/src/utils/format";
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

    const loadGrid = async () => {
      try {
        // PHASE 4A: Use real-time buffer first
        if (session.coverageCells && session.coverageCells.length > 0) {
          if (active) {
            setCoverageCells(
              session.coverageCells.slice(0, GRID_DISPLAY_LIMIT),
            );
          }
          return;
        }

        // PHASE 4B: Load persisted cells from DB
        const persisted = await sessionRepository.getCoverageCellsBySession(
          session.id,
          GRID_DISPLAY_LIMIT,
        );

        if (!active) return;

        if (persisted.length > 0) {
          setCoverageCells(persisted);
          return;
        }

        // PHASE 4C: Generate preview from last N GPS points
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
    };

    loadGrid();

    return () => {
      active = false;
    };
  }, [session?.id, session?.coverageCells, gpsTrace]);

  // ✅ Persist GPS point to state + DB
  const persistLiveGpsPoint = useCallback(
    (sessionId: string, point: GpsPoint) => {
      setSession((prev) => {
        if (!prev || prev.id !== sessionId) return prev;

        // Avoid duplicates
        const alreadyExists = prev.gpsTrace.some(
          (gpsPoint) =>
            gpsPoint.timestamp === point.timestamp &&
            gpsPoint.lat === point.lat &&
            gpsPoint.lon === point.lon,
        );
        if (alreadyExists) return prev;

        // Add GPS point
        const updated = { ...prev, gpsTrace: [...prev.gpsTrace, point] };

        // ✅ PHASE 4: Real-time grid calculation with throttling
        try {
          const now = Date.now();
          const lastUpdate = updated.lastGridUpdateMs || 0;

          // Check throttle: only update if enough time has passed
          if (now - lastUpdate > updated.gridUpdateInterval) {
            // Calculate cells from fresh point only
            const affectedCells = generateCellsFromPoint(sessionId, point, 1);

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
      sessionService.addGpsPoint(sessionId, point).catch((err) => {
        console.error("GPS persistence error:", err);
        setToast("Erreur sauvegarde GPS");
      });
    },
    [setSession],
  );

  // ✅ Load session on focus
  useFocusEffect(
    useCallback(() => {
      let active = true;

      loadCurrentSession()
        .then((current) => {
          if (!active || !current) return;
          setInitialDistance(current.distance ?? 0);
          syncElapsed(
            current.duration ||
              Math.max(0, Math.floor((Date.now() - current.startTime) / 1000)),
          );
          if (current.status === "active" || current.status === "running") {
            startTimer();
            startTracking((point) => {
              persistLiveGpsPoint(current.id, point);
            });
          }
        })
        .catch((err) => console.error("loadCurrentSession error:", err));

      sessionService
        .getDueDracReminders()
        .then((reminders) => {
          const reminder = reminders[0];
          if (!active || !reminder) return;
          Alert.alert(
            "Rappel DRAC 24h",
            "Une trouvaille classee Artefact arrive a l'echeance de declaration.",
            [
              { text: "Plus tard", style: "cancel" },
              {
                text: "Marquer vu",
                onPress: () =>
                  sessionService.markDracReminderSeen(
                    reminder.session.id,
                    reminder.event.id,
                  ),
              },
            ],
          );
        })
        .catch((err) => console.error("getDueDracReminders error:", err));

      return () => {
        active = false;
      };
    }, [
      loadCurrentSession,
      persistLiveGpsPoint,
      startTimer,
      startTracking,
      syncElapsed,
    ]),
  );

  // ✅ Handle start session
  const handleStart = useCallback(async () => {
    const newSession = await createSession();
    if (!newSession) {
      setToast("Impossible de demarrer la session");
      return;
    }

    resetGps();
    setInitialDistance(0);
    resetTimer();
    startTimer();
    await startTracking((point) => {
      persistLiveGpsPoint(newSession.id, point);
    });
    setToast("Session demarree");
  }, [
    createSession,
    persistLiveGpsPoint,
    resetGps,
    resetTimer,
    startTimer,
    startTracking,
  ]);

  // ✅ Handle pause
  const handlePause = useCallback(async () => {
    const updated = await pause();
    if (!updated) return;
    pauseTimer();
    stopTracking();
    setToast("Session en pause");
  }, [pause, pauseTimer, stopTracking]);

  // ✅ Handle resume
  const handleResume = useCallback(async () => {
    if (!session) return;
    const updated = await resume();
    if (!updated) return;
    resumeTimer();
    await startTracking((point) => {
      persistLiveGpsPoint(session.id, point);
    });
    setToast("Session reprise");
  }, [persistLiveGpsPoint, resume, resumeTimer, session, startTracking]);

  // ✅ Handle end session
  const handleEnd = useCallback(() => {
    if (!session) return;

    Alert.alert(
      "Terminer la session ?",
      `Duree: ${formatDuration(elapsed)} - Distance: ${formatDistanceMeters(
        totalDistance,
      )}`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Terminer",
          style: "destructive",
          onPress: async () => {
            stopTracking();
            stopTimer();
            await end(totalDistance, elapsed);
            resetGps();
            setInitialDistance(0);
            resetTimer();
            setToast("Session sauvegardee");
          },
        },
      ],
    );
  }, [
    elapsed,
    end,
    resetGps,
    resetTimer,
    session,
    stopTimer,
    stopTracking,
    totalDistance,
  ]);

  // ✅ Handle add marker
  const handleAddMarker = useCallback(async () => {
    if (!session) return;

    const lat = location?.lat ?? 43.6047;
    const lon = location?.lon ?? 1.4442;
    const event: MarkedEvent = {
      id: makeId(),
      type: "manual",
      timestamp: Date.now(),
      location: {
        lat,
        lon,
        accuracy: location?.accuracy ?? 0,
        timestamp: Date.now(),
      },
      notes: "Marqueur manuel",
    };

    await addEvent(event);
    setToast("Marqueur ajoute");
  }, [addEvent, location, session]);

  // ✅ Handle classify
  const handleClassify = useCallback(
    async (
      classification: string,
      notes?: string,
      photoScale?: MarkedEvent["photoScale"],
    ) => {
      if (!selectedEvent) return;
      await classify(selectedEvent.id, classification, notes, photoScale);
      setToast(`Classe: ${classification}`);
    },
    [classify, selectedEvent],
  );

  // ✅ Handle refill
  const handleRefill = useCallback(async () => {
    if (!selectedEvent) return;
    await refill(selectedEvent.id);
    setClassifyVisible(false);
    setSelectedEvent(null);
    setToast("Trou rebouche ✓");
  }, [refill, selectedEvent]);

  // ✅ Open classify sheet
  const openClassify = useCallback((event: MarkedEvent) => {
    setSelectedEvent(event);
    setClassifyVisible(true);
  }, []);

  // ✅ Render: No session
  if (!session) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.empty}>
          <BrandLogo />
          <Text style={styles.title}>Nouvelle prospection</Text>
          <Text style={styles.subtitle}>
            Lancez une session pour enregistrer la trace GPS et les marqueurs.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Ionicons name="play" size={20} color="white" />
            <Text style={styles.startText}>Demarrer</Text>
          </TouchableOpacity>
        </View>
        <Toast message={toast} onDone={() => setToast(null)} />
      </View>
    );
  }

  // ✅ Render: Session active
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SessionHud
        time={formatDuration(elapsed)}
        distance={totalDistance}
        gpsAccuracy={location?.accuracy}
        isRunning={isRunning}
      />

      <SessionMap
        gpsTrace={gpsTrace}
        userLocation={userLocation}
        events={session.events}
        coverageCells={coverageCells}
        showGrid={showGrid}
        onEventPress={openClassify}
      />

      <TouchableOpacity
        style={[
          styles.redFilterButton,
          { top: insets.top + 92 },
          redFilter && styles.redFilterButtonActive,
        ]}
        onPress={() => setRedFilter((value) => !value)}
      >
        <Ionicons
          name={redFilter ? "moon" : "moon-outline"}
          size={18}
          color={redFilter ? COLORS.background : COLORS.accent}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.gridToggleButton,
          { top: insets.top + 142 },
          showGrid && styles.gridToggleButtonActive,
        ]}
        onPress={() => setShowGrid((value) => !value)}
      >
        <Ionicons
          name="grid-outline"
          size={18}
          color={showGrid ? COLORS.background : COLORS.accent}
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
