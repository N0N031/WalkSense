import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandLogo from "@/src/components/BrandLogo";
import { COLORS } from "@/src/constants/colors";
import { authService } from "@/src/services/authService";

const SCREENS = [
  {
    icon: "compass-outline" as const,
    title: "Prospection terrain",
    text: "Enregistrez la trace GPS, les signaux et les classifications pendant la session.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Cadre responsable",
    text: "Chaque trouvaille peut porter rebouchage, echelle photo et rappel DRAC a 24h.",
  },
  {
    icon: "lock-closed-outline" as const,
    title: "Donnees protegees",
    text: "Vos sessions sont verrouillees localement et hashées a la cloture.",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const screen = SCREENS[index];
  const last = index === SCREENS.length - 1;

  async function next() {
    if (!last) {
      setIndex((value) => value + 1);
      return;
    }
    await authService.completeOnboarding();
    router.replace("/auth" as Href);
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      <BrandLogo />
      <View style={styles.panel}>
        <Ionicons name={screen.icon} size={34} color={COLORS.accent} />
        <Text style={styles.title}>{screen.title}</Text>
        <Text style={styles.text}>{screen.text}</Text>
      </View>
      <View style={styles.dots}>
        {SCREENS.map((item, dotIndex) => (
          <View
            key={item.title}
            style={[styles.dot, index === dotIndex && styles.dotActive]}
          />
        ))}
      </View>
      <TouchableOpacity style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>{last ? "Configurer" : "Suivant"}</Text>
        <Ionicons name="arrow-forward" size={18} color={COLORS.background} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  panel: {
    width: "100%",
    alignItems: "center",
    marginTop: 28,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 14,
    textAlign: "center",
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 22,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  button: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "800",
  },
});
