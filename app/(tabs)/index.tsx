/**
 * WalkSense — Home Screen
 * Affiche l'historique des sessions sauvegardées
 * Permet de voir les détails, supprimer, exporter
 */

import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/src/constants/colors";
import { sessionService, Session } from "@/src/services/sessionService";

const { width } = Dimensions.get("window");
const isWeb = width > 600;

/**
 * ═══════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════
 */

export default function HomeScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Charger les sessions au focus
   */
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

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
   * Supprimer une session
   */
  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      "Supprimer cette session ?",
      "Cette action est irréversible",
      [
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
            } catch (error) {
              Alert.alert("❌ Erreur", "Impossible de supprimer la session");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  /**
   * Exporter session en JSON
   */
  const handleExportJson = async (sessionId: string) => {
    try {
      const json = await sessionService.exportSessionJson(sessionId);
      Alert.alert(
        "✅ Exporté",
        "JSON copié (intégration partage V2.0)\n\n" + json.substring(0, 100) + "..."
      );
    } catch (error) {
      Alert.alert("❌ Erreur", "Impossible d'exporter en JSON");
    }
  };

  /**
   * Exporter session en GPX
   */
  const handleExportGpx = async (sessionId: string) => {
    try {
      const gpx = await sessionService.exportSessionGpx(sessionId);
      Alert.alert(
        "✅ Exporté",
        "GPX prêt pour cartes externes (V2.0)\n\n" + gpx.substring(0, 100) + "..."
      );
    } catch (error) {
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

  /**
   * Formater la distance
   */
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  /**
   * Render session item
   */
  const renderSessionItem = ({ item }: { item: Session }) => (
    <Pressable
      onPress={() => {
        setSelectedSession(item);
        setShowDetails(true);
      }}
      style={({ pressed }) => [
        styles.sessionCard,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.sessionCardHeader}>
        <View>
          <Text style={styles.sessionCardDate}>
            {formatDate(item.startTime)}
          </Text>
          <Text style={styles.sessionCardSubtitle}>
            {item.status === "completed" ? "✅ Terminée" : "⏱️ En cours"}
          </Text>
        </View>
        <View style={styles.sessionCardBadge}>
          <Text style={styles.sessionCardBadgeText}>
            {item.events.length}
          </Text>
        </View>
      </View>

      <View style={styles.sessionCardStats}>
        <View style={styles.statItem}>
          <Ionicons
            name="timer-outline"
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.statLabel}>
            {formatDuration(item.duration)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons
            name="navigate-outline"
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.statLabel}>
            {formatDistance(item.distance)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons
            name="search-outline"
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.statLabel}>
            {item.events.length} trouvailles
          </Text>
        </View>
      </View>
    </Pressable>
  );

  /**
   * Render détails session (modal)
   */
  if (showDetails && selectedSession) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.detailsContainer}>
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
              <Text style={styles.detailsValue}>
                {selectedSession.status === "completed"
                  ? "✅ Terminée"
                  : "⏱️ En cours"}
              </Text>
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
                {formatDistance(selectedSession.distance)}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Trouvailles :</Text>
              <Text style={styles.detailsValue}>
                {selectedSession.events.length}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Points GPS :</Text>
              <Text style={styles.detailsValue}>
                {selectedSession.gpsTrace.length}
              </Text>
            </View>
          </View>

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

                  {event.notes && (
                    <Text style={styles.eventItemNotes}>
                      Notes : {event.notes}
                    </Text>
                  )}

                  <Text style={styles.eventItemCoords}>
                    📍 {event.location.lat.toFixed(5)} ,{" "}
                    {event.location.lon.toFixed(5)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>Actions</Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                handleExportJson(selectedSession.id)
              }
            >
              <Ionicons name="document-outline" size={20} color={COLORS.primary} />
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
      </View>
    );
  }

  /**
   * Render liste sessions
   */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WalkSense</Text>
        <Text style={styles.headerSubtitle}>
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Sessions list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="map-outline"
            size={64}
            color={COLORS.border}
            style={{ marginBottom: 16 }}
          />
          <Text style={styles.emptyTitle}>Aucune session</Text>
          <Text style={styles.emptySubtitle}>
            Allez à l'onglet "Explore" pour commencer
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}
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
    backgroundColor: COLORS.background,
  },

  // ─────────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────────

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },

  sessionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  sessionCardDate: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },

  sessionCardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  sessionCardBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  sessionCardBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  sessionCardStats: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.background,
  },

  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    borderBottomColor: COLORS.border,
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

  // ─────────────────────────────────────────────────────────────────
  // ÉVÉNEMENTS
  // ─────────────────────────────────────────────────────────────────

  eventItem: {
    backgroundColor: COLORS.surface,
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

  eventItemNotes: {
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 4,
    fontStyle: "italic",
  },

  eventItemCoords: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontFamily: "monospace",
  },

  // ─────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
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
});
