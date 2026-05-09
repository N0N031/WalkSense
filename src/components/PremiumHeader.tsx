import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useFonts, Manrope_600SemiBold, Manrope_500Medium } from "@expo-google-fonts/manrope";
import { COLORS } from "@/src/constants/colors";

interface PremiumHeaderProps {
  subtitle?: string;
  rightContent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fadeIn?: boolean;
  compact?: boolean;
}

export default function PremiumHeader({
  subtitle = "Terrain Tracking",
  rightContent,
  style,
  fadeIn = false,
  compact = false,
}: PremiumHeaderProps) {
  const [fontsLoaded] = useFonts({ Manrope_600SemiBold, Manrope_500Medium });
  const opacity = useRef(new Animated.Value(fadeIn ? 0 : 1)).current;

  useEffect(() => {
    if (fadeIn) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        delay: 80,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  const logoSize = compact ? 40 : 52;

  return (
    <Animated.View style={[styles.row, compact && styles.rowCompact, style, { opacity }]}>
      <View style={[styles.logoWrap, { width: logoSize, height: logoSize }]}>
        <Image
          source={require("@/assets/images/walksense-mark.png")}
          style={{ width: logoSize, height: logoSize, borderRadius: 8 }}
          resizeMode="contain"
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.copy}>
        <Text
          style={[
            compact ? styles.titleCompact : styles.title,
            fontsLoaded && { fontFamily: "Manrope_600SemiBold" },
          ]}
          numberOfLines={1}
        >
          WalkSense
        </Text>
        <Text
          style={[
            compact ? styles.subtitleCompact : styles.subtitle,
            fontsLoaded && { fontFamily: "Manrope_500Medium" },
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      {rightContent != null ? (
        <View style={styles.right}>{rightContent}</View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowCompact: {
    gap: 9,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(212, 175, 55, 0.20)",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 19,
    fontWeight: "600",
    color: COLORS.accent,
    letterSpacing: 0.2,
  },
  titleCompact: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.accent,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#B8B4A8",
    letterSpacing: 0.5,
  },
  subtitleCompact: {
    fontSize: 10,
    fontWeight: "500",
    color: "#B8B4A8",
    letterSpacing: 0.4,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
