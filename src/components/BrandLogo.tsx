import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, View } from "react-native";

interface BrandLogoProps {
  compact?: boolean;
  size?: "small" | "medium" | "large";
  style?: StyleProp<ImageStyle>;
}

export default function BrandLogo({
  compact = false,
  size = "medium",
  style,
}: BrandLogoProps) {
  const logoStyle =
    compact || size === "small"
      ? styles.compactLogo
      : size === "large"
        ? styles.largeLogo
        : styles.logo;

  return (
    <View style={compact ? styles.compactFrame : styles.frame}>
      <Image
        source={require("@/assets/images/walksense-mark-512.png")}
        resizeMode="contain"
        style={[logoStyle, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
  },
  logo: {
    width: 240,
    height: 255,
  },
  compactFrame: {
    alignItems: "flex-start",
  },
  compactLogo: {
    width: 74,
    height: 74,
  },
  largeLogo: {
    width: 250,
    height: 250,
  },
});
