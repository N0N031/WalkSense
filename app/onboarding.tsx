import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandLogo from "@/src/components/BrandLogo";
import PremiumBackground from "@/src/components/PremiumBackground";
import { COLORS } from "@/src/constants/colors";
import { authService } from "@/src/services/authService";

const SCREENS = [
  {
    icon: "compass-outline" as const,
    tag: "TERRAIN",
    title: "Prospection terrain",
    text: "Enregistrez la trace GPS, les signaux et les classifications pendant la session.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    tag: "RESPONSABLE",
    title: "Cadre responsable",
    text: "Chaque trouvaille peut porter rebouchage, échelle photo et rappel DRAC à 24h.",
  },
  {
    icon: "lock-closed-outline" as const,
    tag: "PRIVÉ",
    title: "Données protégées",
    text: "Vos sessions sont verrouillées localement et hashées à la clôture.",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const screen = SCREENS[index];
  const last = index === SCREENS.length - 1;

  async function next() {
    if (!last) {
      setIndex((v) => v + 1);
      return;
    }
    await authService.completeOnboarding();
    router.replace("/auth" as Href);
  }

  return (
    <PremiumBackground>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <BrandLogo size="medium" />

        <View style={styles.card}>
          <View style={styles.iconRing}>
            <Ionicons name={screen.icon} size={32} color={COLORS.accent} />
          </View>
          <View style={styles.tagWrap}>
            <Text style={styles.tag}>{screen.tag}</Text>
          </View>
          <Text style={styles.title}>{screen.title}</Text>
          <Text style={styles.text}>{screen.text}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SCREENS.map((item, i) => (
              <View key={item.tag} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={next} activeOpacity={0.85}>
            <Text style={styles.buttonText}>{last ? "Configurer" : "Suivant"}</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.background} />
          </TouchableOpacity>

          {!last && (
            <TouchableOpacity
              onPress={async () => {
                await authService.completeOnboarding();
                router.replace("/auth" as Href);
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.skip}>Passer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </PremiumBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    alignItems: "center",
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    shadowColor: COLORS.glowGreen,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    gap: 12,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.glassStrong,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tagWrap: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(212, 175, 55, 0.14)",
  },
  tag: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  footer: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 28,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  button: {
    width: "100%",
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  skip: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontWeight: "600",
  },
});
