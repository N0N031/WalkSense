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
      <View style={styles.logoWrap}>
        <Image
          source={require("@/assets/images/walksense-mark-source-transparent.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
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
    gap: 14,
  },
  logoWrap: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 60,
    height: 60,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.accent,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 3.5,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
