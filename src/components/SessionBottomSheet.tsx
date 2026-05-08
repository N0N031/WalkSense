import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import { MarkedEvent } from "@/src/services/sessionService";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import EventCard from "./EventCard";

interface SessionBottomSheetProps {
  events: MarkedEvent[];
  onAddMarker: () => void;
  onEventPress: (event: MarkedEvent) => void;
}

export default function SessionBottomSheet({
  events,
  onAddMarker,
  onEventPress,
}: SessionBottomSheetProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Marqueurs</Text>
          <Text style={styles.subtitle}>{events.length} evenement(s)</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAddMarker}>
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="radio-outline" size={28} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Aucun marqueur</Text>
          </View>
        ) : (
          events.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              index={index}
              onPress={onEventPress}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 2,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: COLORS.cardBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
});
