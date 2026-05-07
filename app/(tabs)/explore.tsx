/**
 * WalkSense — Active Session Screen
 * Écran principal de session active avec GPS en temps réel, détecteur BLE,
 * marqueurs, classification d'événements et aperçu PDF.
 *
 * Fusion du design Claude Design + logique Expo Router
 * V1.0 MVP — Persistance AsyncStorage + Export PDF (V2.0)
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { COLORS } from "@/src/constants/colors";
import SessionMap from "@/src/components/SessionMap";
import {
  GpsPoint,
  MarkedEvent,
  Session,
  sessionService,
} from "@/src/services/sessionService";
import { haversineKm } from "@/src/utils/distance";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


/**
 * ═══════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════
 */

export default function ExploreScreen() {
  // ─────────────────────────────────────────────────────────────────
  // STATE — Session
  // ─────────────────────────────────────────────────────────────────

  const [sessionState, setSessionState] = useState<Session | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [distance, setDistance] = useState(0);

  // ─────────────────────────────────────────────────────────────────
  // STATE — UI
  // ─────────────────────────────────────────────────────────────────

  const [showClassifySheet, setShowClassifySheet] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MarkedEvent | null>(null);
  const [_privacyMode, _setPrivacyMode] = useState<
    "private" | "blurred" | "group" | "ghost"
  >("private");
  const [gpsAccuracy, setGpsAccuracy] = useState(0);
  const [signal, setSignal] = useState(0);
  const [battery, setBattery] = useState(100);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const lastGpsRef = useRef<GpsPoint | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // AUTO-HIDE TOAST
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ─────────────────────────────────────────────────────────────────
  // LIFECYCLE — Load session on focus
  // ─────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadCurrentSession();
    }, []),
  );

  // ─────────────────────────────────────────────────────────────────
  // LIFECYCLE — Timer
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // ─────────────────────────────────────────────────────────────────
  // LIFECYCLE — Simulate Signal & Battery
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isRunning) return;
    const sim = setInterval(() => {
      setSignal(Math.max(30, Math.random() * 100));
      setBattery((prev) => Math.max(20, prev - 0.2));
    }, 5000);
    return () => clearInterval(sim);
  }, [isRunning]);

  // ─────────────────────────────────────────────────────────────────
  // LIFECYCLE — Real GPS tracking
  // ─────────────────────────────────────────────────────────────────

  const gpsSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!isRunning) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setToast("⚠️ Permission GPS refusée");
        return;
      }
      gpsSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 0,
        },
        (loc) => {
          const { latitude, longitude, accuracy } = loc.coords;
          const acc = accuracy ?? 999;

          // Ignorer les points trop imprécis (antenne GSM seule, bâtiment épais)
          if (acc > 40) return;

          setGpsAccuracy(acc);
          setUserLocation({ latitude, longitude });

          const point: GpsPoint = {
            lat: latitude,
            lon: longitude,
            accuracy: acc,
            timestamp: loc.timestamp,
          };

          if (lastGpsRef.current) {
            const d = haversineKm(
              lastGpsRef.current.lat,
              lastGpsRef.current.lon,
              latitude,
              longitude
            );
            // Ignorer les sauts aberrants (> 50 m entre deux points)
            if (d < 0.05) {
              setDistance((prev) => prev + d);
            }
          }

          lastGpsRef.current = point;
          setSessionState((prev) =>
            prev ? { ...prev, gpsTrace: [...prev.gpsTrace, point] } : null
          );
        }
      );
    })();

    return () => {
      gpsSubscriptionRef.current?.remove();
      gpsSubscriptionRef.current = null;
    };
  }, [isRunning]);

  // ─────────────────────────────────────────────────────────────────
  // METHODS — Session management
  // ─────────────────────────────────────────────────────────────────

  const loadCurrentSession = async () => {
    try {
      const current = await sessionService.getCurrentSession();
      if (current) {
        setSessionState(current);
        setIsRunning(current.status === "running");
        setElapsed(Math.floor((Date.now() - current.startTime) / 1000));
      }
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const handleStartSession = async () => {
    try {
      const newSession = await sessionService.createSession();
      if (newSession) {
        setSessionState(newSession);
        setIsRunning(true);
        setElapsed(0);
        setDistance(0);
        setBattery(100);
        setToast("▶️ Session démarrée");
      }
    } catch (error) {
      console.error("Error starting session:", error);
      setToast("❌ Erreur au démarrage");
    }
  };

  const handlePauseSession = async () => {
    if (!sessionState) return;

    try {
      const updated = await sessionService.pauseSession();
      if (updated) {
        setSessionState(updated);
        setIsRunning(false);
        setToast("⏸️ Session en pause");
      }
    } catch (error) {
      console.error("Error pausing session:", error);
      setToast("❌ Erreur");
    }
  };

  const handleResumeSession = async () => {
    if (!sessionState) return;

    try {
      const updated = await sessionService.resumeSession();
      if (updated) {
        setSessionState(updated);
        setIsRunning(true);
        setToast("▶️ Session reprise");
      }
    } catch (error) {
      console.error("Error resuming session:", error);
      setToast("❌ Erreur");
    }
  };

  const handleStopSession = () => {
    Alert.alert(
      "Terminer la session ?",
      `Durée: ${formatTime(elapsed)} · Distance: ${distance.toFixed(2)} km`,
      [
        {
          text: "Annuler",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Terminer",
          onPress: async () => {
            try {
              await sessionService.endSession(sessionState?.id || "", {
                endTime: Date.now(),
                distance: distance,
                duration: elapsed,
              });

              setSessionState(null);
              setIsRunning(false);
              setElapsed(0);
              setDistance(0);
              setToast("✅ Session sauvegardée");
            } catch (error) {
              console.error("Error ending session:", error);
              setToast("❌ Erreur");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const addAutoEvent = async () => {
    if (!sessionState) return;

    const lat = userLocation?.latitude ?? 43.6047 + (Math.random() - 0.5) * 0.02;
    const lon = userLocation?.longitude ?? 1.4442 + (Math.random() - 0.5) * 0.02;
    const event: MarkedEvent = {
      id: Math.random().toString(36).slice(2, 11),
      type: "auto",
      location: { lat, lon, accuracy: gpsAccuracy, timestamp: Date.now() },
      timestamp: Date.now(),
      signal: signal,
    };

    setSessionState((prev) =>
      prev ? { ...prev, events: [...prev.events, event] } : null,
    );

    await sessionService.addEvent(sessionState.id, event);
  };

  const handleAddManualMarker = async () => {
    if (!sessionState) return;

    const lat = userLocation?.latitude ?? 43.6047 + (Math.random() - 0.5) * 0.02;
    const lon = userLocation?.longitude ?? 1.4442 + (Math.random() - 0.5) * 0.02;
    const event: MarkedEvent = {
      id: Math.random().toString(36).slice(2, 11),
      type: "manual",
      location: { lat, lon, accuracy: gpsAccuracy, timestamp: Date.now() },
      timestamp: Date.now(),
      notes: "Marqueur manuel",
    };

    setSessionState((prev) =>
      prev ? { ...prev, events: [...prev.events, event] } : null,
    );

    await sessionService.addEvent(sessionState.id, event);
    setToast("📍 Marqueur ajouté");
  };

  const handleOpenClassifySheet = (event: MarkedEvent) => {
    setSelectedEvent(event);
    setShowClassifySheet(true);
  };

  const classifyEvent = useCallback(
    (eventId: string, classification: string, notes?: string) => {
      setSessionState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          events: prev.events.map((e) =>
            e.id === eventId ? { ...e, classification, notes } : e,
          ),
        };
      });
      setShowClassifySheet(false);
      setSelectedEvent(null);
      setToast(`✅ Classifié: ${classification}`);
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────
  // METHODS — Utils
  // ─────────────────────────────────────────────────────────────────

  const getSignalColor = (val: number) => {
    if (val < 30) return COLORS.error;
    if (val < 60) return COLORS.warning;
    return COLORS.success;
  };

  const getBatteryColor = (val: number) => {
    if (val < 20) return COLORS.error;
    if (val < 50) return COLORS.warning;
    return COLORS.success;
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER — Idle state (no session)
  // ─────────────────────────────────────────────────────────────────

  if (!sessionState) {
    return (
      <View style={styles.container}>
        {/* Toast */}
        {toast && <Toast message={toast} />}

        {/* Empty state */}
        <View style={styles.emptyState}>
          <Ionicons name="map" size={64} color={COLORS.primary} />
          <Text style={styles.emptyStateTitle}>Aucune session active</Text>
          <Text style={styles.emptyStateSubtitle}>
            Commencez une nouvelle recherche
          </Text>

          <TouchableOpacity
            style={styles.buttonLarge}
            onPress={handleStartSession}
          >
            <Ionicons name="play" size={24} color="white" />
            <Text style={styles.buttonLargeText}>Démarrer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER — Active session
  // ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Toast */}
      {toast && <Toast message={toast} />}

      {/* TOP HUD */}
      <TopHud
        elapsed={elapsed}
        distance={distance}
        gpsAccuracy={gpsAccuracy}
        signal={signal}
        signalColor={getSignalColor(signal)}
        battery={battery}
        batteryColor={getBatteryColor(battery)}
      />

      {/* MAP VIEW */}
      <SessionMap
        gpsTrace={sessionState.gpsTrace}
        userLocation={userLocation}
        events={sessionState.events}
        onEventPress={handleOpenClassifySheet}
      />

      {/* BOTTOM SHEET — Events */}
      <BottomSheet
        events={sessionState.events}
        onAddMarker={handleAddManualMarker}
        onClassifyEvent={handleOpenClassifySheet}
        onAddAutoEvent={addAutoEvent}
      />

      {/* BOTTOM CONTROLS */}
      <View style={styles.bottomControls}>
        {isRunning ? (
          <>
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton]}
              onPress={handlePauseSession}
            >
              <Ionicons name="pause" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStopSession}
            >
              <Ionicons name="stop" size={24} color="white" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.controlButton, styles.playButton]}
            onPress={handleResumeSession}
          >
            <Ionicons name="play" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* CLASSIFY SHEET MODAL */}
      <ClassifySheet
        visible={showClassifySheet}
        event={selectedEvent}
        onClassify={(classification, notes) => {
          if (selectedEvent) {
            classifyEvent(selectedEvent.id, classification, notes);
          }
        }}
        onClose={() => {
          setShowClassifySheet(false);
          setSelectedEvent(null);
        }}
      />
    </View>
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * COMPONENTS
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * TOP HUD — Timer, GPS, Signal, Battery
 */

interface TopHudProps {
  elapsed: number;
  distance: number;
  gpsAccuracy: number;
  signal: number;
  signalColor: string;
  battery: number;
  batteryColor: string;
}

function TopHud({
  elapsed,
  distance,
  gpsAccuracy,
  signal,
  signalColor,
  battery,
  batteryColor,
}: TopHudProps) {
  return (
    <View style={styles.hudContainer}>
      {/* Left: Timer & Distance */}
      <View style={styles.hudLeft}>
        <Text style={styles.hudLabel}>Chrono</Text>
        <Text style={styles.hudTimer}>{formatTime(elapsed)}</Text>
        <Text style={styles.hudLabel}>Distance</Text>
        <Text style={styles.hudValue}>{distance.toFixed(2)} km</Text>
      </View>

      {/* Right: GPS, Signal, Battery */}
      <View style={styles.hudRight}>
        <HudItem
          icon="location"
          label="GPS"
          value={`${gpsAccuracy.toFixed(1)} m`}
          color={gpsAccuracy < 15 ? COLORS.success : COLORS.warning}
        />
        <HudItem
          icon="radio"
          label="Signal"
          value={`${Math.round(signal)}%`}
          color={signalColor}
        />
        <HudItem
          icon="battery-charging"
          label="Batterie"
          value={`${Math.round(battery)}%`}
          color={batteryColor}
        />
      </View>
    </View>
  );
}

interface HudItemProps {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function HudItem({ icon, label, value, color }: HudItemProps) {
  return (
    <View style={styles.hudItem}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={styles.hudItemLabel}>{label}</Text>
      <Text style={[styles.hudItemValue, { color }]}>{value}</Text>
    </View>
  );
}

/**
 * BOTTOM SHEET — Events list
 */

interface BottomSheetProps {
  events: MarkedEvent[];
  onAddMarker: () => void;
  onClassifyEvent: (event: MarkedEvent) => void;
  onAddAutoEvent: () => void;
}

function BottomSheet({
  events,
  onAddMarker,
  onClassifyEvent,
  onAddAutoEvent,
}: BottomSheetProps) {
  const unclassified = events.filter((e) => !e.classification);
  const classified = events.filter((e) => e.classification);

  return (
    <View style={styles.bottomSheetContainer}>
      {/* Header */}
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>
          Trouvailles ({events.length})
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={onAddAutoEvent}
          >
            <Ionicons name="radio" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={onAddMarker}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Events list */}
      <ScrollView
        style={styles.eventsList}
        showsVerticalScrollIndicator={false}
      >
        {unclassified.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              À classer ({unclassified.length})
            </Text>
            {unclassified.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => onClassifyEvent(event)}
              />
            ))}
          </>
        )}

        {classified.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              Classifiés ({classified.length})
            </Text>
            {classified.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => onClassifyEvent(event)}
              />
            ))}
          </>
        )}

        {events.length === 0 && (
          <View style={styles.emptyEventsList}>
            <Ionicons name="search" size={40} color={COLORS.border} />
            <Text style={styles.emptyEventsText}>Aucune trouvaille</Text>
            <Text style={styles.emptyEventsSubtext}>
              Les détections apparaîtront ici
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * EVENT CARD
 */

interface EventCardProps {
  event: MarkedEvent;
  onPress: () => void;
}

const EVENT_TYPE_ICON: Record<string, string> = {
  auto: "radio",
  find: "star",
};
const EVENT_TYPE_LABEL: Record<string, string> = {
  auto: "Détecté",
  find: "Trouvé",
};
const EVENT_TYPE_COLOR: Record<string, string> = {
  auto: COLORS.primary,
  find: COLORS.success,
};

function EventCard({ event, onPress }: EventCardProps) {
  const icon = EVENT_TYPE_ICON[event.type] ?? "pin";
  const label = EVENT_TYPE_LABEL[event.type] ?? "Marqueur";
  const color = EVENT_TYPE_COLOR[event.type] ?? COLORS.warning;

  return (
    <TouchableOpacity style={styles.eventCard} onPress={onPress}>
      <View style={styles.eventCardLeft}>
        <Ionicons
          name={icon as any}
          size={20}
          color={color}
        />
        <View style={styles.eventCardInfo}>
          <Text style={styles.eventCardLabel}>{label}</Text>
          {!!event.signal && (
            <Text style={styles.eventCardMeta}>
              Signal: {Math.round(event.signal)}%
            </Text>
          )}
          {event.classification && (
            <Text style={styles.eventCardClassification}>
              {event.classification}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
    </TouchableOpacity>
  );
}

/**
 * CLASSIFY SHEET MODAL
 */

interface ClassifySheetProps {
  visible: boolean;
  event: MarkedEvent | null;
  onClassify: (classification: string, notes?: string) => void;
  onClose: () => void;
}

function ClassifySheet({
  visible,
  event,
  onClassify,
  onClose,
}: ClassifySheetProps) {
  const [notes, setNotes] = useState("");

  const classifications = [
    { id: "coin", label: "Pièce", emoji: "🪙" },
    { id: "jewelry", label: "Bijou", emoji: "💍" },
    { id: "metal", label: "Métal", emoji: "⚙️" },
    { id: "trash", label: "Déchet", emoji: "🗑️" },
    { id: "unknown", label: "Inconnu", emoji: "❓" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.classifyModal}>
          {/* Header */}
          <View style={styles.classifyHeader}>
            <Text style={styles.classifyTitle}>Classer la trouvaille</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Event info */}
          {event && (
            <View style={styles.classifyEventInfo}>
              <Text style={styles.classifyEventLabel}>
                {event.type === "auto" ? "Détecté" : "Marqueur"}
              </Text>
              <Text style={styles.classifyEventDetails}>
                {event.signal !== undefined && event.signal !== null
                  ? `Signal: ${Math.round(event.signal)}%`
                  : "Signal: N/A"}{" "}
                · Lat:{" "}
                {event.position?.latitude
                  ? event.position.latitude.toFixed(4)
                  : "N/A"}
              </Text>
            </View>
          )}

          {/* Classifications */}
          <View style={styles.classificationsGrid}>
            {classifications.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={styles.classificationButton}
                onPress={() => {
                  onClassify(cls.label, notes);
                  setNotes("");
                }}
              >
                <Text style={styles.classificationEmoji}>{cls.emoji}</Text>
                <Text style={styles.classificationLabel}>{cls.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.classifyCloseButton}
            onPress={onClose}
          >
            <Text style={styles.classifyCloseButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * TOAST NOTIFICATION
 */

interface ToastProps {
  message: string;
}

function Toast({ message }: ToastProps) {
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * STYLES
 * ═══════════════════════════════════════════════════════════════════
 */

const styles = StyleSheet.create({
  // ───────────────────────────────────────────────────────────────
  // CONTAINER
  // ───────────────────────────────────────────────────────────────

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ───────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ───────────────────────────────────────────────────────────────

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
  },

  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 32,
  },

  // ───────────────────────────────────────────────────────────────
  // HUD
  // ───────────────────────────────────────────────────────────────

  hudContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  hudLeft: {
    flex: 1,
  },

  hudRight: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },

  hudLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginBottom: 4,
  },

  hudTimer: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: "monospace",
    marginBottom: 8,
  },

  hudValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  hudItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  hudItemLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  hudItemValue: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ───────────────────────────────────────────────────────────────
  // MAP
  // ───────────────────────────────────────────────────────────────

  mapContainer: {
    flex: 3,
    position: "relative",
    overflow: "hidden",
  },

  mapBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  routePath: {
    position: "absolute",
    width: "80%",
    height: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
    borderRadius: 1.5,
    top: "50%",
  },

  eventMarker: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  eventMarkerText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  mapControls: {
    position: "absolute",
    bottom: 16,
    right: 16,
    gap: 8,
  },

  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  userLocationMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.info,
    borderWidth: 2,
    borderColor: "white",
  },

  mapAttribution: {
    position: "absolute",
    bottom: 4,
    right: 8,
    fontSize: 9,
    color: COLORS.textTertiary,
  },

  // ───────────────────────────────────────────────────────────────
  // BOTTOM SHEET
  // ───────────────────────────────────────────────────────────────

  bottomSheetContainer: {
    flex: 2,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
  },

  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },

  headerActions: {
    flexDirection: "row",
    gap: 8,
  },

  headerActionButton: {
    padding: 4,
  },

  addMarkerButton: {
    padding: 4,
  },

  eventsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },

  eventCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  eventCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  eventCardInfo: {
    flex: 1,
  },

  eventCardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  eventCardMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  eventCardClassification: {
    fontSize: 11,
    color: COLORS.success,
    marginTop: 2,
    fontWeight: "500",
  },

  emptyEventsList: {
    alignItems: "center",
    paddingVertical: 40,
  },

  emptyEventsText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 12,
  },

  emptyEventsSubtext: {
    fontSize: 12,
    color: COLORS.border,
    marginTop: 4,
  },

  // ───────────────────────────────────────────────────────────────
  // BUTTONS
  // ───────────────────────────────────────────────────────────────

  controlButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
    flexDirection: "row",
    gap: 8,
  },

  playButton: {
    backgroundColor: COLORS.success,
  },

  pauseButton: {
    backgroundColor: COLORS.warning,
  },

  stopButton: {
    backgroundColor: COLORS.error,
  },

  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  buttonLargeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },

  // ───────────────────────────────────────────────────────────────
  // BOTTOM CONTROLS
  // ───────────────────────────────────────────────────────────────

  bottomControls: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },

  // ───────────────────────────────────────────────────────────────
  // CLASSIFY MODAL
  // ───────────────────────────────────────────────────────────────

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  classifyModal: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "80%",
  },

  classifyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  classifyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },

  classifyEventInfo: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },

  classifyEventLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  classifyEventDetails: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
    fontFamily: "monospace",
  },

  classificationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  classificationButton: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  classificationEmoji: {
    fontSize: 32,
  },

  classificationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },

  classifyCloseButton: {
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },

  classifyCloseButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // ───────────────────────────────────────────────────────────────
  // TOAST
  // ───────────────────────────────────────────────────────────────

  toast: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.text,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },

  toastText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
