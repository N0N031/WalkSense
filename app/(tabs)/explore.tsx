import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandLogo from "@/src/components/BrandLogo";
import ClassifySheet from "@/src/components/ClassifySheet";
import SessionBottomSheet from "@/src/components/SessionBottomSheet";
import SessionHud from "@/src/components/SessionHud";
import SessionMap from "@/src/components/SessionMap";
import Toast from "@/src/components/Toast";
import { COLORS } from "@/src/constants/colors";
import { useBle } from "@/src/hooks/useBle";
import { useGps } from "@/src/hooks/useGps";
import { useSession } from "@/src/hooks/useSession";
import { useTimer } from "@/src/hooks/useTimer";
import {
  GpsPoint,
  MarkedEvent,
  sessionService,
} from "@/src/services/sessionService";
import { formatDistanceMeters } from "@/src/utils/format";

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
  const ble = useBle();

  const [toast, setToast] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MarkedEvent | null>(null);
  const [classifyVisible, setClassifyVisible] = useState(false);
  const [initialDistance, setInitialDistance] = useState(0);
  const [redFilter, setRedFilter] = useState(false);

  const signal = useMemo(() => {
    if (!ble.metrics) return 0;
    return Math.max(0, Math.min(100, ((ble.metrics.rssi + 90) / 90) * 100));
  }, [ble.metrics]);

  const battery = ble.metrics?.battery ?? 100;
  const totalDistance = initialDistance + liveDistance;
  const gpsTrace = session?.gpsTrace ?? [];
  const userLocation = location
    ? { latitude: location.lat, longitude: location.lon }
    : null;

  const persistLiveGpsPoint = useCallback(
    (sessionId: string, point: GpsPoint) => {
      setSession((prev) => {
        if (!prev || prev.id !== sessionId) return prev;
        const alreadyExists = prev.gpsTrace.some(
          (gpsPoint) =>
            gpsPoint.timestamp === point.timestamp &&
            gpsPoint.lat === point.lat &&
            gpsPoint.lon === point.lon,
        );
        if (alreadyExists) return prev;
        return { ...prev, gpsTrace: [...prev.gpsTrace, point] };
      });

      sessionService.addGpsPoint(sessionId, point).catch((err) => {
        console.error("GPS persistence error:", err);
        setToast("Erreur sauvegarde GPS");
      });
    },
    [setSession],
  );

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

  const handlePause = useCallback(async () => {
    const updated = await pause();
    if (!updated) return;
    pauseTimer();
    stopTracking();
    setToast("Session en pause");
  }, [pause, pauseTimer, stopTracking]);

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
  }, [elapsed, end, resetGps, resetTimer, session, stopTimer, stopTracking, totalDistance]);

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
      signal,
      notes: "Marqueur manuel",
    };

    await addEvent(event);
    setToast("Marqueur ajoute");
  }, [addEvent, location, session, signal]);

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

  const handleRefill = useCallback(async () => {
    if (!selectedEvent) return;
    await refill(selectedEvent.id);
    setClassifyVisible(false);
    setSelectedEvent(null);
    setToast("Trou rebouche ✓");
  }, [refill, selectedEvent]);

  const openClassify = useCallback((event: MarkedEvent) => {
    setSelectedEvent(event);
    setClassifyVisible(true);
  }, []);

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
            Lancez une session pour enregistrer la trace GPS et les signaux.
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SessionHud
        time={formatDuration(elapsed)}
        distance={totalDistance}
        gpsAccuracy={location?.accuracy}
        signal={signal}
        battery={battery}
        isRunning={isRunning}
      />

      <SessionMap
        gpsTrace={gpsTrace}
        userLocation={userLocation}
        events={session.events}
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
    <TouchableOpacity style={[styles.control, { backgroundColor: color }]} onPress={onPress}>
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
