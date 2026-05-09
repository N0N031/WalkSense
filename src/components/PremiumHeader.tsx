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
import { COLORS } from "@/src/constants/colors";

interface PremiumHeaderProps {
  subtitle?: string;
  rightContent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fadeIn?: boolean;
}

export default function PremiumHeader({
  subtitle = "TERRAIN TRACKING",
  rightContent,
  style,
  fadeIn = false,
}: PremiumHeaderProps) {
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

  return (
    <Animated.View style={[styles.row, style, { opacity }]}>
      <View style={styles.logoRing}>
        <Image
          source={require("@/assets/images/walksense-mark-source-transparent.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          WalkSense
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
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
    gap: 10,
  },
  logoRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.38)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212, 175, 55, 0.05)",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 14,
  },
  logo: {
    width: 48,
    height: 48,
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(212, 175, 55, 0.22)",
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#807C74",
    letterSpacing: 1.3,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
