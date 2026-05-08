import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import { MarkedEvent } from "@/src/services/sessionService";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface EventCardProps {
  event: MarkedEvent;
  index: number;
  onPress: (event: MarkedEvent) => void;
}

export default function EventCard({ event, index, onPress }: EventCardProps) {
  const needsRefill = Boolean(event.classification && !event.refilledAt);
  const dracDue =
    event.dracReminderAt && !event.dracReminderSeenAt
      ? event.dracReminderAt <= Date.now()
      : false;
  const color =
    event.type === "auto"
      ? COLORS.markerAuto
      : event.type === "find"
        ? COLORS.markerFind
        : COLORS.markerManual;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(event)}>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{index + 1}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {event.type === "auto"
            ? "Detection auto"
            : event.type === "find"
              ? "Trouvaille"
              : "Marqueur manuel"}
        </Text>
        <Text style={styles.meta}>
          {new Date(event.timestamp).toLocaleTimeString()}
        </Text>
        {event.classification ? (
          <Text style={styles.classification}>{event.classification}</Text>
        ) : null}
        {event.refilledAt || needsRefill ? (
          <View style={styles.refilledRow}>
            <Ionicons
              name={event.refilledAt ? "checkmark-circle" : "alert-circle"}
              size={12}
              color={event.refilledAt ? COLORS.success : COLORS.warning}
            />
            <Text
              style={[
                styles.refilledText,
                needsRefill && styles.refillPendingText,
              ]}
            >
              {event.refilledAt ? "Rebouche" : "A reboucher"}
            </Text>
          </View>
        ) : null}
        {event.photoScale && event.photoScale !== "none" ? (
          <Text style={styles.scaleText}>Echelle: {scaleLabel(event.photoScale)}</Text>
        ) : null}
        {event.dracReminderAt ? (
          <View style={styles.dracRow}>
            <Ionicons
              name={dracDue ? "alert-circle" : "time-outline"}
              size={12}
              color={dracDue ? COLORS.warning : COLORS.info}
            />
            <Text style={[styles.dracText, dracDue && styles.dracTextDue]}>
              DRAC 24h
            </Text>
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
}

function scaleLabel(scale: MarkedEvent["photoScale"]) {
  switch (scale) {
    case "coin":
      return "piece";
    case "rule":
      return "regle";
    case "hand":
      return "main";
    default:
      return "aucune";
  }
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "800",
  },
  content: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  classification: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  refilledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  refilledText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
  },
  refillPendingText: {
    color: COLORS.warning,
  },
  scaleText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  dracRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  dracText: {
    color: COLORS.info,
    fontSize: 11,
    fontWeight: "700",
  },
  dracTextDue: {
    color: COLORS.warning,
  },
});
