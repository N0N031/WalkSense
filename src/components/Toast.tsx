import { COLORS } from "@/src/constants/colors";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

interface ToastProps {
  message: string | null;
  onDone?: () => void;
}

export default function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onDone?.(), 2200);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <View style={styles.toast}>
      <View style={styles.accent} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 96,
    left: 18,
    right: 18,
    zIndex: 20,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(5, 12, 7, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.30)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  accent: {
    width: 3,
    alignSelf: "stretch",
    backgroundColor: COLORS.accent,
  },
  text: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
});
