import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandLogo from "@/src/components/BrandLogo";
import PremiumBackground from "@/src/components/PremiumBackground";
import { COLORS } from "@/src/constants/colors";
import { authService } from "@/src/services/authService";

const PIN_MAX = 6;
const PIN_MIN = 4;

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [hasAuth, setHasAuth] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showScreen, setShowScreen] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;

  const goHome = useCallback(() => router.replace("/(tabs)"), []);

  const tryBiometric = useCallback(async () => {
    const ok = await authService.unlockWithBiometrics();
    if (ok) goHome();
  }, [goHome]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  useEffect(() => {
    async function init() {
      const [auth, bio] = await Promise.all([
        authService.hasAuth(),
        authService.isBiometricAvailable(),
      ]);
      setHasAuth(auth);
      setBiometricAvailable(bio);
      if (auth && bio) {
        const ok = await authService.unlockWithBiometrics();
        if (ok) goHome();
        else setShowScreen(true);
      } else {
        setShowScreen(true);
      }
    }
    init();
  }, [goHome]);

  const handleKey = useCallback(async (key: string) => {
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (pin.length >= PIN_MAX) return;

    const next = pin + key;
    setPin(next);

    if (next.length >= PIN_MIN) {
      const ok = hasAuth
        ? await authService.unlock(next)
        : Boolean(await authService.setup(next));
      if (ok) {
        setError('');
        goHome();
      } else if (next.length === PIN_MAX) {
        setError(hasAuth ? 'Code incorrect' : 'Erreur');
        setPin('');
      }
    }
  }, [pin, hasAuth, goHome]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (!showScreen) return null;

  return (
    <PremiumBackground>
      <View style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.top}>
          <BrandLogo size="large" />
          <Text style={styles.title}>{hasAuth ? 'Bon retour' : 'Créer le code'}</Text>
          <Text style={styles.subtitle}>
            {hasAuth
              ? 'Saisissez votre code ou utilisez votre empreinte digitale.'
              : 'Choisissez un code PIN pour protéger vos sessions.'}
          </Text>
        </View>

        {/* PIN dots */}
        <View style={styles.dots}>
          {Array.from({ length: PIN_MAX }).map((_, i) => {
            const filled = i < pin.length;
            return (
              <View key={i} style={[styles.dot, filled && styles.dotFilled]} />
            );
          })}
        </View>
        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color={COLORS.error} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <View style={styles.errorRow} />
        )}

        {/* Numpad */}
        <View style={styles.keypad}>
          {KEYS.map((key, i) => {
            if (key === '') return <View key={i} />;
            const isErase = key === '⌫';
            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleKey(key)}
                activeOpacity={0.65}
                style={[styles.key, isErase && styles.keyErase]}
              >
                <Text style={[styles.keyText, isErase && styles.keyEraseText]}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Biometric */}
        {biometricAvailable && (
          <TouchableOpacity style={styles.bioWrap} onPress={tryBiometric} activeOpacity={0.8}>
            <View style={styles.bioOuter}>
              <Animated.View style={[styles.bioRing, { transform: [{ rotate: spin }] }]} />
              <View style={styles.bioInner}>
                <Ionicons name="finger-print" size={38} color={COLORS.accent} />
              </View>
            </View>
            <Text style={styles.bioLabel}>Empreinte digitale</Text>
          </TouchableOpacity>
        )}
      </View>
    </PremiumBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  top: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 14,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: '75%',
  },
  dots: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 4,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 20,
  },
  error: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: '600',
  },
  keypad: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 300,
    gap: 10,
    justifyContent: 'center',
  },
  key: {
    width: '30%',
    height: 60,
    borderRadius: 14,
    backgroundColor: 'rgba(245,241,232,0.04)',
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyErase: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyText: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '600',
  },
  keyEraseText: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    color: COLORS.textTertiary,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  bioWrap: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  bioOuter: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioRing: {
    position: 'absolute',
    inset: 0,
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  bioInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  bioLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
