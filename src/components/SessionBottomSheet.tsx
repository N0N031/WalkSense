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
          <Text style={styles.title}>MARQUEURS</Text>
          <Text style={styles.subtitle}>{events.length} evenement</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAddMarker}>
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {events.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.radar}>
              <View style={styles.radarDot} />
            </View>
            <Text style={styles.emptyTitle}>Aucun marqueur detecte</Text>
            <Text style={styles.emptyText}>
              Ajoutez un point d interet sur le terrain
            </Text>
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
    marginHorizontal: 22,
    paddingTop: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.glass,
    overflow: "hidden",
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
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
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
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(82, 224, 79, 0.16)",
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
    paddingVertical: 48,
    gap: 8,
  },
  radar: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(82, 224, 79, 0.18)",
    backgroundColor: "rgba(82, 224, 79, 0.04)",
  },
  radarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.glowGreen,
    shadowColor: COLORS.glowGreen,
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
