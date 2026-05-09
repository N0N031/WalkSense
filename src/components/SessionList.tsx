import { COLORS } from "@/src/constants/colors";
import { Session } from "@/src/services/sessionService";
import { formatDistanceMeters, formatDuration } from "@/src/utils/format";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SessionListProps {
  sessions: Session[];
  visibleSessionIds: Set<string>;
  onToggle: (sessionId: string) => void;
}

function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function getSessionTitle(session: Session): string {
  const customName = session.name?.trim();
  if (customName) return customName;
  const commune = session.commune?.trim();
  if (commune) return commune;
  return "Session sans titre";
}

export function SessionList({
  sessions,
  visibleSessionIds,
  onToggle,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Aucune session</Text>
        <Text style={styles.emptyText}>Les traces apparaitront ici.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {sessions.map((session) => {
        const selected = visibleSessionIds.has(session.id);
        return (
          <Pressable
            key={session.id}
            style={[styles.row, selected && styles.rowSelected]}
            onPress={() => onToggle(session.id)}
          >
            <View style={styles.checkbox}>
              <Ionicons
                name={selected ? "checkbox" : "square-outline"}
                size={22}
                color={selected ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{getSessionTitle(session)}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>Date {formatShortDate(session.startTime)}</Text>
                <Text style={styles.meta}>Temps {formatDuration(session.duration)}</Text>
                <Text style={styles.meta}>
                  Lieu {session.commune?.trim() || "Non localise"}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metric}>
                  {formatDistanceMeters(session.distance)}
                </Text>
                <Text style={styles.metric}>
                  {session.events.length === 0
                    ? "Aucun evenement"
                    : `${session.events.length} marqueur${
                        session.events.length > 1 ? "s" : ""
                      }`}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(5, 12, 7, 0.86)",
  },
  rowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(12, 34, 14, 0.92)",
  },
  checkbox: {
    paddingTop: 2,
  },
  content: {
    flex: 1,
    gap: 7,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  metric: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 6,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
});
