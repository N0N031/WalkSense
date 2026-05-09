import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type MapType = "google" | "satellite" | "osm" | "ign";

interface MapTypeToggleProps {
  currentType: MapType;
  onChange: (type: MapType) => void;
}

const TYPES: { id: MapType; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "satellite", label: "Satellite" },
  { id: "osm", label: "OSM" },
  { id: "ign", label: "IGN" },
];

export function MapTypeToggle({ currentType, onChange }: MapTypeToggleProps) {
  return (
    <View style={styles.container}>
      {TYPES.map((type) => {
        const active = currentType === type.id;
        return (
          <Pressable
            key={type.id}
            onPress={() => onChange(type.id)}
            style={[styles.button, active && styles.buttonActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {type.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 6,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(5, 12, 7, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.30)",
  },
  button: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "rgba(229, 231, 235, 0.18)",
  },
  buttonActive: {
    backgroundColor: "#2563EB",
  },
  text: {
    color: "#F5F1E8",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  textActive: {
    color: "white",
  },
});
