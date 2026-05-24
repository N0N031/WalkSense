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
        source={require("@/assets/images/walksense-mark-source-transparent.png")}
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
    width: 156,
    height: 156,
  },
  compactFrame: {
    alignItems: "flex-start",
  },
  compactLogo: {
    width: 48,
    height: 48,
  },
  largeLogo: {
    width: 124,
    height: 124,
  },
});
