import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";

const SPLASH_BG = require("../assets/images/walksense-splash-bg.png");
const LOGO_MARK = require("../assets/images/walksense-mark-512.png");

export default function WalkSenseSplash() {
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ringAnimation = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 2600,
        useNativeDriver: true,
      })
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    const progressAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 2100,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ])
    );

    ringAnimation.start();
    pulseAnimation.start();
    progressAnimation.start();

    return () => {
      ringAnimation.stop();
      pulseAnimation.stop();
      progressAnimation.stop();
    };
  }, [progress, pulse, rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["18%", "82%"],
  });

  return (
    <ImageBackground source={SPLASH_BG} style={styles.container} resizeMode="cover">
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.logoStage}>
          <Animated.View
            style={[
              styles.loadingRing,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.logoGlow,
              {
                transform: [{ scale: pulse }],
              },
            ]}
          />

          <Animated.Image
            source={LOGO_MARK}
            style={[
              styles.logo,
              {
                transform: [{ scale: pulse }],
              },
            ]}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>
          <Text style={styles.titleLight}>Walk</Text>
          <Text style={styles.titleGreen}>Sense</Text>
        </Text>

        <Text style={styles.subtitle}>TRACKING & EXPLORATION</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.loadingText}>CHARGEMENT...</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050805",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 96,
  },
  logoStage: {
    width: 330,
    height: 330,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingRing: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 5,
    borderColor: "rgba(61, 189, 61, 0.16)",
    borderTopColor: "#8BE84A",
    borderRightColor: "rgba(139, 232, 74, 0.82)",
    borderBottomColor: "rgba(61, 189, 61, 0.20)",
  },
  logoGlow: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(61, 189, 61, 0.20)",
  },
  logo: {
    width: 230,
    height: 230,
  },
  title: {
    marginTop: 22,
    fontSize: 52,
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: -1,
  },
  titleLight: {
    color: "#F4F4F4",
  },
  titleGreen: {
    color: "#7DDA45",
  },
  subtitle: {
    marginTop: 12,
    color: "rgba(139, 232, 74, 0.82)",
    fontSize: 14,
    letterSpacing: 7,
  },
  bottom: {
    position: "absolute",
    bottom: 72,
    left: 54,
    right: 54,
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(125, 218, 69, 0.16)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#8BE84A",
  },
  loadingText: {
    marginTop: 24,
    color: "rgba(139, 232, 74, 0.92)",
    fontSize: 14,
    letterSpacing: 7,
  },
});
