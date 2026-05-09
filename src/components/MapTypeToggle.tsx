import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type MapType =
  | "google"
  | "satellite"
  | "osm"
  | "ign"
  | "ign-ortho"
  | "ign-cassini"
  | "ign-etatmajor"
  | "ign-cadastre";

interface MapTypeToggleProps {
  currentType: MapType;
  onChange: (type: MapType) => void;
}

const TYPES: { id: MapType; label: string }[] = [
  { id: "google", label: "Route" },
  { id: "satellite", label: "Sat." },
  { id: "osm", label: "OSM" },
  { id: "ign", label: "IGN" },
  { id: "ign-ortho", label: "Ortho" },
  { id: "ign-cassini", label: "Cassini" },
  { id: "ign-etatmajor", label: "État-Maj." },
  { id: "ign-cadastre", label: "Cadastre" },
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    padding: 6,
    borderRadius: 12,
    backgroundColor: "rgba(5, 12, 7, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.28)",
  },
  button: {
    flexBasis: "47%",
    flexGrow: 1,
    paddingHorizontal: 4,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "rgba(229, 231, 235, 0.12)",
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: "rgba(212, 175, 55, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.55)",
  },
  text: {
    color: "#C8C4BA",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  textActive: {
    color: "#D4AF37",
  },
});
