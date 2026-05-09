import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/src/constants/colors";

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
  compact?: boolean;
}

const TYPES: { id: MapType; label: string }[] = [
  { id: "google",        label: "Route" },
  { id: "satellite",     label: "Sat." },
  { id: "osm",           label: "OSM" },
  { id: "ign",           label: "IGN" },
  { id: "ign-ortho",     label: "Ortho" },
  { id: "ign-cassini",   label: "Cassini" },
  { id: "ign-etatmajor", label: "État-Maj." },
  { id: "ign-cadastre",  label: "Cadastre" },
];

export function MapTypeToggle({
  currentType,
  onChange,
  compact = false,
}: MapTypeToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.root}>
      <Pressable
        style={[
          styles.trigger,
          compact && styles.triggerCompact,
          open && styles.triggerOpen,
        ]}
        onPress={() => setOpen((v) => !v)}
      >
        <Ionicons
          name={open ? "layers" : "layers-outline"}
          size={compact ? 18 : 20}
          color={open ? COLORS.accent : "#C8C4BA"}
        />
      </Pressable>

      {open && (
        <View style={styles.panel}>
          {TYPES.map((type) => {
            const active = currentType === type.id;
            return (
              <Pressable
                key={type.id}
                onPress={() => { onChange(type.id); setOpen(false); }}
                style={[styles.btn, active && styles.btnActive]}
              >
                <Text style={[styles.label, active && styles.labelActive]}>
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "flex-end",
    gap: 6,
  },
  trigger: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(5, 12, 8, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.34)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  triggerCompact: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  triggerOpen: {
    borderColor: "rgba(212, 175, 55, 0.55)",
    backgroundColor: "rgba(5, 12, 8, 0.96)",
  },
  panel: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    padding: 7,
    borderRadius: 12,
    backgroundColor: "rgba(5, 12, 8, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.28)",
    width: 182,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  btn: {
    flexBasis: "47%",
    flexGrow: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "rgba(212, 212, 200, 0.08)",
    alignItems: "center",
  },
  btnActive: {
    backgroundColor: "rgba(212, 175, 55, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.45)",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D0CCC4",
    textAlign: "center",
  },
  labelActive: {
    color: COLORS.accent,
  },
});
