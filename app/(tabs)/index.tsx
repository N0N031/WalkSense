/**
 * WalkSense — Home Screen
 * Affiche l'historique des sessions sauvegardées
 * Permet de voir les détails, supprimer, exporter
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    ImageBackground,
    Modal,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BrandLogo from "@/src/components/BrandLogo";
import PremiumBackground from "@/src/components/PremiumBackground";
import { COLORS } from "@/src/constants/colors";
import { Session, sessionService } from "@/src/services/sessionService";
import { formatDistanceMeters } from "@/src/utils/format";

/**
 * ═══════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════
 */

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [exportPreview, setExportPreview] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  /**
   * Charger les sessions depuis le service
   */
  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await sessionService.getSessions();
      // Trier par date décroissante (plus récentes d'abord)
      const sorted = data.sort((a, b) => b.startTime - a.startTime);
      setSessions(sorted);
    } catch (error) {
      console.error("Error loading sessions:", error);
      Alert.alert("❌ Erreur", "Impossible de charger les sessions");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charger les sessions au focus
   */
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, []),
  );

  useEffect(() => {
    loadSessions();
  }, []);

  /**
   * Supprimer une session
   */
  const handleDeleteSession = (sessionId: string) => {
    Alert.alert("Supprimer cette session ?", "Cette action est irréversible", [
      {
        text: "Annuler",
        style: "cancel",
      },
      {
        text: "Supprimer",
        onPress: async () => {
          try {
            await sessionService.deleteSession(sessionId);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            setShowDetails(false);
            Alert.alert("✅ Session supprimée");
          } catch {
            Alert.alert("❌ Erreur", "Impossible de supprimer la session");
          }
        },
        style: "destructive",
      },
    ]);
  };

  /**
   * Exporter session en JSON
   */
  const handleExportJson = async (sessionId: string) => {
    try {
      const json = await sessionService.exportSessionJson(sessionId);
      setExportPreview({ title: "Export JSON", content: json });
    } catch {
      Alert.alert("❌ Erreur", "Impossible d'exporter en JSON");
    }
  };

  /**
   * Exporter session en GPX
   */
  const handleExportGpx = async (sessionId: string) => {
    try {
      const gpx = await sessionService.exportSessionGpx(sessionId);
      setExportPreview({ title: "Export GPX", content: gpx });
    } catch {
      Alert.alert("❌ Erreur", "Impossible d'exporter en GPX");
    }
  };

  /**
   * Formater la date
   */
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Formater la durée (secondes → HH:MM:SS)
   */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getRefillStats = (session: Session) => {
    const classified = session.events.filter((event) => event.classification);
    const refilled = classified.filter((event) => event.refilledAt);
    return {
      total: classified.length,
      done: refilled.length,
      pending: classified.length - refilled.length,
    };
  };

  const selectedSessions = sessions.filter((session) =>
    selectedSessionIds.includes(session.id),
  );

  const toggleSelectionMode = () => {
    setSelectionMode((current) => {
      if (current) setSelectedSessionIds([]);
      return !current;
    });
  };

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId],
    );
  };

  const toggleSelectAll = () => {
    setSelectedSessionIds((current) =>
      sessions.length > 0 && current.length === sessions.length
        ? []
        : sessions.map((session) => session.id),
    );
  };

  const handleExportSelectedJson = () => {
    if (selectedSessions.length === 0) {
      Alert.alert(
        "Selection vide",
        "Choisissez au moins une session a exporter.",
      );
      return;
    }

    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      sessionCount: selectedSessions.length,
      totals: {
        distance: selectedSessions.reduce(
          (sum, session) => sum + session.distance,
          0,
        ),
        duration: selectedSessions.reduce(
          (sum, session) => sum + session.duration,
          0,
        ),
        events: selectedSessions.reduce(
          (sum, session) => sum + session.events.length,
          0,
        ),
        gpsPoints: selectedSessions.reduce(
          (sum, session) => sum + session.gpsTrace.length,
          0,
        ),
      },
      sessions: selectedSessions,
    };

    setExportPreview({
      title: `Export JSON global (${selectedSessions.length})`,
      content: JSON.stringify(payload, null, 2),
    });
  };

  const handleExportSelectedGpx = () => {
    if (selectedSessions.length === 0) {
      Alert.alert(
        "Selection vide",
        "Choisissez au moins une session a exporter.",
      );
      return;
    }

    setExportPreview({
      title: `Export GPX global (${selectedSessions.length})`,
      content: buildMultiSessionGpx(selectedSessions),
    });
  };

  const activeCount = sessions.filter(
    (session) => session.status !== "completed",
  ).length;
  const completedCount = sessions.filter(
    (session) => session.status === "completed",
  ).length;
  const totalEvents = sessions.reduce(
    (sum, session) => sum + session.events.length,
    0,
  );

  const renderExportPreview = () => (
    <Modal
      visible={exportPreview !== null}
      animationType="slide"
      onRequestClose={() => setExportPreview(null)}
    >
      <View style={[styles.exportContainer, { paddingTop: insets.top }]}>
        <View style={styles.exportHeader}>
          <TouchableOpacity
            style={styles.detailsBackButton}
            onPress={() => setExportPreview(null)}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            <Text style={styles.detailsBackText}>Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportShareButton}
            onPress={() => {
              if (!exportPreview) return;
              Share.share({
                title: exportPreview.title,
                message: exportPreview.content,
              });
            }}
          >
            <Ionicons
              name="share-outline"
              size={18}
              color={COLORS.background}
            />
            <Text style={styles.exportShareText}>Partager</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.exportTitle}>{exportPreview?.title}</Text>
        <ScrollView
          style={styles.exportBody}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <Text selectable style={styles.exportText}>
            {exportPreview?.content}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );

  /**
   * Render session item
   */
  const renderSessionItem = ({ item }: { item: Session }) => (
    <Pressable
      onPress={() => {
        if (selectionMode) {
          toggleSessionSelection(item.id);
          return;
        }
        setSelectedSession(item);
        setShowDetails(true);
      }}
      onLongPress={() => {
        setSelectionMode(true);
        toggleSessionSelection(item.id);
      }}
      style={({ pressed }) => [
        styles.sessionCard,
        selectionMode &&
          selectedSessionIds.includes(item.id) &&
          styles.sessionCardSelected,
        pressed && { opacity: 0.7 },
      ]}
    >
      {selectionMode ? (
        <View style={styles.selectionCheck}>
          <Ionicons
            name={
              selectedSessionIds.includes(item.id)
                ? "checkmark"
                : "ellipse-outline"
            }
            size={18}
            color={
              selectedSessionIds.includes(item.id)
                ? COLORS.primary
                : COLORS.accent
            }
          />
        </View>
      ) : null}
      {(() => {
        const refillStats = getRefillStats(item);
        return refillStats.total > 0 ? (
          <View
            style={[
              styles.refillSummary,
              refillStats.pending > 0 && styles.refillSummaryPending,
            ]}
          >
            <Ionicons
              name={
                refillStats.pending > 0 ? "alert-circle" : "checkmark-circle"
              }
              size={13}
              color={refillStats.pending > 0 ? COLORS.warning : COLORS.success}
            />
            <Text
              style={[
                styles.refillSummaryText,
                refillStats.pending > 0 && styles.refillSummaryTextPending,
              ]}
            >
              {refillStats.done}/{refillStats.total} rebouches
            </Text>
          </View>
        ) : null;
      })()}
      <View
        style={[
          styles.sessionCardHeader,
          selectionMode && styles.sessionCardHeaderSelecting,
        ]}
      >
        <View>
          <Text style={styles.sessionCardDate}>
            {formatDate(item.startTime)}
          </Text>
          <View style={styles.statusChip}>
            <Ionicons
              name={
                item.status === "completed"
                  ? "checkmark-circle"
                  : "radio-button-on"
              }
              size={13}
              color={
                item.status === "completed" ? COLORS.success : COLORS.warning
              }
            />
            <Text style={styles.sessionCardSubtitle}>
              {item.status === "completed" ? "Terminée" : "En cours"}
            </Text>
            {item.hash ? (
              <>
                <Text style={styles.sessionCardSubtitle}> · </Text>
                <Ionicons name="lock-closed" size={11} color={COLORS.accent} />
                <Text
                  style={[styles.sessionCardSubtitle, { color: COLORS.accent }]}
                >
                  Verrouillée
                </Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={styles.sessionCardBadge}>
          <Text style={styles.sessionCardBadgeText}>{item.events.length}</Text>
        </View>
      </View>

      <View style={styles.sessionCardStats}>
        <View style={styles.statItem}>
          <Ionicons name="timer-outline" size={16} color={COLORS.primary} />
          <Text style={styles.statLabel}>{formatDuration(item.duration)}</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
          <Text style={styles.statLabel}>
            {formatDistanceMeters(item.distance)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="search-outline" size={16} color={COLORS.primary} />
          <Text style={styles.statLabel}>{item.events.length} trouvailles</Text>
        </View>
      </View>
    </Pressable>
  );

  /**
   * Render détails session (modal)
   */
  if (showDetails && selectedSession) {
    return (
      <PremiumBackground>
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
          <ScrollView
            style={styles.detailsContainer}
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            {/* Header */}
            <View style={styles.detailsHeader}>
              <TouchableOpacity
                onPress={() => setShowDetails(false)}
                style={styles.detailsBackButton}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={COLORS.primary}
                />
                <Text style={styles.detailsBackText}>Retour</Text>
              </TouchableOpacity>
            </View>

            {/* Infos principales */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Informations</Text>

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Date/Heure :</Text>
                <Text style={styles.detailsValue}>
                  {formatDate(selectedSession.startTime)}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>État :</Text>
                <View style={styles.statusChip}>
                  <Ionicons
                    name={
                      selectedSession.status === "completed"
                        ? "checkmark-circle"
                        : "radio-button-on"
                    }
                    size={14}
                    color={
                      selectedSession.status === "completed"
                        ? COLORS.success
                        : COLORS.warning
                    }
                  />
                  <Text style={styles.detailsValue}>
                    {selectedSession.status === "completed"
                      ? "Terminée"
                      : "En cours"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Durée :</Text>
                <Text style={styles.detailsValue}>
                  {formatDuration(selectedSession.duration)}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Distance :</Text>
                <Text style={styles.detailsValue}>
                  {formatDistanceMeters(selectedSession.distance)}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Trouvailles :</Text>
                <Text style={styles.detailsValue}>
                  {selectedSession.events.length}
                </Text>
              </View>

              {getRefillStats(selectedSession).total > 0 ? (
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Rebouchage :</Text>
                  <Text
                    style={[
                      styles.detailsValue,
                      getRefillStats(selectedSession).pending > 0 &&
                        styles.detailsWarning,
                    ]}
                  >
                    {getRefillStats(selectedSession).done}/
                    {getRefillStats(selectedSession).total} confirmes
                  </Text>
                </View>
              ) : null}

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Points GPS :</Text>
                <Text style={styles.detailsValue}>
                  {selectedSession.gpsTrace.length}
                </Text>
              </View>
            </View>

            {/* Hash SHA-256 */}
            {selectedSession.hash ? (
              <View style={styles.detailsSection}>
                <View style={styles.hashHeader}>
                  <Ionicons
                    name="lock-closed"
                    size={15}
                    color={COLORS.accent}
                  />
                  <Text style={styles.detailsSectionTitle}>
                    Session verrouillée
                  </Text>
                </View>
                <Text style={styles.hashSubtitle}>
                  SHA-256 calculé à la clôture — toute modification invalide
                  cette empreinte.
                </Text>
                <View style={styles.hashBox}>
                  <Text style={styles.hashText}>{selectedSession.hash}</Text>
                </View>
                {selectedSession.lockedAt ? (
                  <Text style={styles.hashDate}>
                    Verrouillée le {formatDate(selectedSession.lockedAt)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Événements */}
            {selectedSession.events.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>
                  Trouvailles ({selectedSession.events.length})
                </Text>

                {selectedSession.events.map((event, idx) => (
                  <View key={event.id} style={styles.eventItem}>
                    <View style={styles.eventItemHeader}>
                      <Text style={styles.eventItemTime}>
                        #{idx + 1} · {formatDate(event.timestamp)}
                      </Text>
                      <View
                        style={[
                          styles.eventItemBadge,
                          {
                            backgroundColor:
                              event.type === "metal"
                                ? "#FFD700"
                                : event.type === "noise"
                                  ? "#FF6B6B"
                                  : event.type === "anomaly"
                                    ? "#4ECDC4"
                                    : COLORS.border,
                          },
                        ]}
                      >
                        <Text style={styles.eventItemBadgeText}>
                          {event.type}
                        </Text>
                      </View>
                    </View>

                    {event.classification && (
                      <Text style={styles.eventItemClassification}>
                        Classification : {event.classification} ✓
                      </Text>
                    )}

                    {event.classification ? (
                      <View style={styles.refillStatusRow}>
                        <Ionicons
                          name={
                            event.refilledAt
                              ? "checkmark-circle"
                              : "alert-circle"
                          }
                          size={13}
                          color={
                            event.refilledAt ? COLORS.success : COLORS.warning
                          }
                        />
                        <Text
                          style={[
                            styles.refillStatusText,
                            !event.refilledAt && styles.refillStatusPending,
                          ]}
                        >
                          {event.refilledAt
                            ? `Rebouche le ${formatDate(event.refilledAt)}`
                            : "A reboucher"}
                        </Text>
                      </View>
                    ) : null}

                    {event.notes && (
                      <Text style={styles.eventItemNotes}>
                        Notes : {event.notes}
                      </Text>
                    )}

                    <View style={styles.coordsRow}>
                      <Ionicons
                        name="location-outline"
                        size={11}
                        color={COLORS.textTertiary}
                      />
                      <Text style={styles.eventItemCoords}>
                        {event.location.lat.toFixed(5)},{" "}
                        {event.location.lon.toFixed(5)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Actions</Text>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleExportJson(selectedSession.id)}
              >
                <Ionicons
                  name="document-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.actionButtonText}>Exporter JSON</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleExportGpx(selectedSession.id)}
              >
                <Ionicons name="map-outline" size={20} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Exporter GPX</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={() => handleDeleteSession(selectedSession.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={[styles.actionButtonText, { color: "#FF6B6B" }]}>
                  Supprimer la session
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
          {renderExportPreview()}
        </View>
      </PremiumBackground>
    );
  }

  /**
   * Render liste sessions
   */
  return (
    <PremiumBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ImageBackground
          source={require("@/assets/images/walksense-splash-bg.png")}
          resizeMode="cover"
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.header}>
            <BrandLogo compact />
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>WalkSense</Text>
              <Text style={styles.headerSubtitle}>
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={toggleSelectionMode}
            >
              <Ionicons
                name={selectionMode ? "close" : "checkbox-outline"}
                size={20}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            <StatTile
              value={activeCount}
              label="En cours"
              icon="radio-button-on"
            />
            <StatTile
              value={completedCount}
              label="Terminees"
              icon="checkmark-circle"
            />
            <StatTile value={totalEvents} label="Total" icon="search-outline" />
          </View>
        </ImageBackground>

        {selectionMode ? (
          <View style={styles.selectionToolbar}>
            <View>
              <Text style={styles.selectionTitle}>
                {selectedSessionIds.length} selectionnee
                {selectedSessionIds.length > 1 ? "s" : ""}
              </Text>
              <TouchableOpacity onPress={toggleSelectAll}>
                <Text style={styles.selectionLink}>
                  {selectedSessionIds.length === sessions.length &&
                  sessions.length > 0
                    ? "Tout deselectionner"
                    : "Tout selectionner"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                style={[
                  styles.selectionActionButton,
                  selectedSessionIds.length === 0 &&
                    styles.selectionActionDisabled,
                ]}
                onPress={handleExportSelectedJson}
                disabled={selectedSessionIds.length === 0}
              >
                <Ionicons
                  name="document-text-outline"
                  size={17}
                  color={COLORS.accent}
                />
                <Text style={styles.selectionActionText}>JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectionActionButton,
                  selectedSessionIds.length === 0 &&
                    styles.selectionActionDisabled,
                ]}
                onPress={handleExportSelectedGpx}
                disabled={selectedSessionIds.length === 0}
              >
                <Ionicons name="map-outline" size={17} color={COLORS.accent} />
                <Text style={styles.selectionActionText}>GPX</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Sessions list */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BrandLogo />
            <Text style={styles.emptyTitle}>Aucune session</Text>
            <Text style={styles.emptySubtitle}>
              Allez a l&apos;onglet &quot;Explore&quot; pour commencer
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            renderItem={renderSessionItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 96 },
            ]}
            scrollEnabled={true}
          />
        )}
        {renderExportPreview()}
      </View>
    </PremiumBackground>
  );
}

function buildMultiSessionGpx(sessions: Session[]): string {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WalkSense">
  <metadata>
    <name>WalkSense export global</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
`;

  for (const session of sessions) {
    gpx += `  <trk>
    <name>Session ${escapeXml(session.id)}</name>
    <trkseg>
`;

    for (const point of session.gpsTrace) {
      gpx += `      <trkpt lat="${point.lat}" lon="${point.lon}">
        <ele>${point.altitude || 0}</ele>
        <time>${new Date(point.timestamp).toISOString()}</time>
        <accuracy>${point.accuracy}</accuracy>
      </trkpt>\n`;
    }

    gpx += `    </trkseg>
  </trk>
`;

    for (const event of session.events) {
      const lat = event.position?.latitude ?? event.location.lat;
      const lon = event.position?.longitude ?? event.location.lon;
      const label = `${event.type} - ${event.classification || "non classe"}`;
      gpx += `  <wpt lat="${lat}" lon="${lon}">
    <name>${escapeXml(label)}</name>
    <time>${new Date(event.timestamp).toISOString()}</time>
    <desc>${escapeXml(event.notes || "")}</desc>
    <extensions>
      <sessionId>${escapeXml(session.id)}</sessionId>
    </extensions>
  </wpt>
`;
    }
  }

  gpx += "</gpx>";
  return gpx;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function StatTile({
  value,
  label,
  icon,
}: {
  value: number;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileValue}>{value}</Text>
      <View style={styles.statTileLabelRow}>
        <Ionicons name={icon} size={11} color={COLORS.primary} />
        <Text style={styles.statTileLabel}>{label}</Text>
      </View>
    </View>
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * STYLES
 * ═══════════════════════════════════════════════════════════════════
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // ─────────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────────

  hero: {
    marginHorizontal: 14,
    marginTop: 0,
    marginBottom: 10,
    minHeight: 224,
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.glassStrong,
  },

  heroImage: {
    opacity: 0.92,
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.30)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },

  headerCopy: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.accent,
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  settingsButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.glass,
  },

  selectionToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.glassStrong,
  },

  selectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  selectionLink: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },

  selectionActions: {
    flexDirection: "row",
    gap: 8,
  },

  selectionActionButton: {
    minWidth: 68,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: "rgba(212, 175, 55, 0.10)",
  },

  selectionActionDisabled: {
    opacity: 0.35,
  },

  selectionActionText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "900",
  },

  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: "auto",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  statTile: {
    flex: 1,
    minHeight: 74,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(2, 8, 5, 0.76)",
  },

  statTileValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },

  statTileLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  statTileLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },

  // ─────────────────────────────────────────────────────────────────
  // LIST
  // ─────────────────────────────────────────────────────────────────

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },

  sessionCard: {
    backgroundColor: COLORS.glass,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.glowGreen,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    marginBottom: 8,
  },

  sessionCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: "rgba(12, 26, 12, 0.92)",
  },

  selectionCheck: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.glassStrong,
  },

  sessionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  sessionCardHeaderSelecting: {
    paddingRight: 36,
  },

  sessionCardDate: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },

  sessionCardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  sessionCardBadge: {
    backgroundColor: "transparent",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  sessionCardBadgeText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  sessionCardStats: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  refillSummary: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
    marginBottom: 10,
  },

  refillSummaryPending: {
    borderColor: COLORS.warning,
  },

  refillSummaryText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "800",
  },

  refillSummaryTextPending: {
    color: COLORS.warning,
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  statLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
  },

  // ─────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────────────────────────────────────────

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // ─────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  // ─────────────────────────────────────────────────────────────────
  // DETAILS MODAL
  // ─────────────────────────────────────────────────────────────────

  detailsContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },

  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.glassStrong,
  },

  detailsBackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  detailsBackText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },

  detailsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.glass,
  },

  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },

  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },

  detailsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  detailsValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },

  detailsWarning: {
    color: COLORS.warning,
  },

  // ─────────────────────────────────────────────────────────────────
  // ÉVÉNEMENTS
  // ─────────────────────────────────────────────────────────────────

  eventItem: {
    backgroundColor: COLORS.glass,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },

  eventItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  eventItemTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  eventItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  eventItemBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },

  eventItemClassification: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    marginBottom: 4,
  },

  refillStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },

  refillStatusText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },

  refillStatusPending: {
    color: COLORS.warning,
  },

  eventItemNotes: {
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 4,
    fontStyle: "italic",
  },

  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  eventItemCoords: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontFamily: "monospace",
  },

  // ─────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────

  hashHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  hashSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },

  hashBox: {
    backgroundColor: COLORS.glassStrong,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  hashText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: COLORS.accent,
    letterSpacing: 0.5,
    flexWrap: "wrap",
  },

  hashDate: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 8,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.glass,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  actionButtonDanger: {
    borderColor: "#FF6B6B",
    backgroundColor: "rgba(255, 107, 107, 0.05)",
  },

  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    flex: 1,
  },

  exportContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  exportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  exportShareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },

  exportShareText: {
    color: COLORS.background,
    fontSize: 13,
    fontWeight: "800",
  },

  exportTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  exportBody: {
    flex: 1,
    paddingHorizontal: 16,
  },

  exportText: {
    color: COLORS.text,
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: COLORS.glassStrong,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
});
