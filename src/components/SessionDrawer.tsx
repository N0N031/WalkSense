import { SessionList } from "@/src/components/SessionList";
import { COLORS } from "@/src/constants/colors";
import { sessionService, Session } from "@/src/services/sessionService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionsToggle?: (sessionIds: string[]) => void;
  selectedSessionIds?: string[] | null;
}

export function SessionDrawer({
  isOpen,
  onClose,
  onSessionsToggle,
  selectedSessionIds,
}: SessionDrawerProps) {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleSessions, setVisibleSessions] = useState<Set<string>>(
    () => new Set(),
  );
  const selectedSessionIdsRef = useRef<string[] | null | undefined>(
    selectedSessionIds,
  );

  useEffect(() => {
    selectedSessionIdsRef.current = selectedSessionIds;
  }, [selectedSessionIds]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 12,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > 60) onClose();
        },
      }),
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    async function loadSessions() {
      setLoading(true);
      try {
        const data = await sessionService.getSessions();
        if (!active) return;
        const sorted = data.sort((a, b) => b.startTime - a.startTime);
        const ids = sorted.map((session) => session.id);
        const selectedIds = selectedSessionIdsRef.current ?? ids;
        setSessions(sorted);
        setVisibleSessions(new Set(selectedIds));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSessions();
    return () => {
      active = false;
    };
  }, [isOpen]);

  const allIds = useMemo(
    () => sessions.map((session) => session.id),
    [sessions],
  );

  const emit = useCallback(
    (next: Set<string>) => {
      setVisibleSessions(next);
      onSessionsToggle?.(Array.from(next));
    },
    [onSessionsToggle],
  );

  const handleToggle = useCallback(
    (sessionId: string) => {
      const updated = new Set(visibleSessions);
      if (updated.has(sessionId)) updated.delete(sessionId);
      else updated.add(sessionId);
      emit(updated);
    },
    [emit, visibleSessions],
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modal}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.drawer,
            { paddingBottom: Math.max(insets.bottom, 10) + 14 },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Sessions</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={COLORS.accent} />
              </View>
            ) : (
              <SessionList
                sessions={sessions}
                visibleSessionIds={visibleSessions}
                onToggle={handleToggle}
              />
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => emit(new Set())}
            >
              <Text style={styles.secondaryText}>Tout masquer</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => emit(new Set(allIds))}
            >
              <Text style={styles.primaryText}>Tout afficher</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  drawer: {
    maxHeight: "72%",
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  loading: {
    paddingVertical: 32,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.glassStrong,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  primaryText: {
    color: COLORS.background,
    fontWeight: "900",
  },
});
