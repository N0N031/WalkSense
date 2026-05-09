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
import { useFonts, Rajdhani_700Bold, Rajdhani_600SemiBold } from "@expo-google-fonts/rajdhani";
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
  const [fontsLoaded] = useFonts({ Rajdhani_700Bold, Rajdhani_600SemiBold });
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
          source={require("@/assets/images/walksense-mark.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.copy}>
        <Text
          style={[styles.title, fontsLoaded && { fontFamily: "Rajdhani_700Bold" }]}
          numberOfLines={1}
        >
          WalkSense
        </Text>
        <Text
          style={[styles.subtitle, fontsLoaded && { fontFamily: "Rajdhani_600SemiBold" }]}
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
  logoWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(212, 175, 55, 0.22)",
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#807C74",
    letterSpacing: 1.4,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
