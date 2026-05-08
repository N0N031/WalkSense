import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, View } from "react-native";

interface BrandLogoProps {
  compact?: boolean;
  style?: StyleProp<ImageStyle>;
}

export default function BrandLogo({ compact = false, style }: BrandLogoProps) {
  return (
    <View style={compact ? styles.compactFrame : styles.frame}>
      <Image
        source={require("@/assets/images/walksense-mark-512.png")}
        resizeMode="contain"
        style={[compact ? styles.compactLogo : styles.logo, style]}
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
    width: 148,
    height: 82,
  },
});
