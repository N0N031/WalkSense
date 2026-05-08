import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

import { COLORS } from "@/src/constants/colors";

interface PremiumBackgroundProps {
  children: React.ReactNode;
  padded?: boolean;
}

export default function PremiumBackground({
  children,
  padded = false,
}: PremiumBackgroundProps) {
  return (
    <ImageBackground
      source={require("@/assets/images/walksense-splash-bg.png")}
      resizeMode="cover"
      style={styles.background}
    >
      <View style={styles.vignette} />
      <View style={styles.greenWash} />
      <View style={[styles.content, padded && styles.padded]}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  greenWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 24, 12, 0.42)",
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 18,
  },
});
