import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandLogo from "@/src/components/BrandLogo";
import { COLORS } from "@/src/constants/colors";
import { authService } from "@/src/services/authService";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [hasAuth, setHasAuth] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);

  const goHome = useCallback(() => router.replace("/(tabs)"), []);

  const tryBiometric = useCallback(async () => {
    const ok = await authService.unlockWithBiometrics();
    if (ok) goHome();
  }, [goHome]);

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
        else setShowPasscode(true);
      } else {
        setShowPasscode(true);
      }
    }
    init();
  }, [goHome]);

  async function submit() {
    if (passcode.length < 4) {
      setError("Code de 4 caractères minimum");
      return;
    }

    const ok = hasAuth
      ? await authService.unlock(passcode)
      : Boolean(await authService.setup(passcode));

    if (!ok) {
      setError("Code incorrect");
      return;
    }

    setError("");
    goHome();
  }

  if (!showPasscode) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      <View style={styles.content}>
        <BrandLogo compact />
        <Text style={styles.title}>{hasAuth ? "Déverrouiller" : "Créer le code"}</Text>
        <Text style={styles.subtitle}>
          {hasAuth
            ? "Entrez le code local pour ouvrir RockSense."
            : "Ce code protege les sessions stockees sur votre appareil."}
        </Text>

        <TextInput
          value={passcode}
          onChangeText={setPasscode}
          secureTextEntry
          autoFocus={!biometricAvailable}
          placeholder="Code local"
          placeholderTextColor={COLORS.textTertiary}
          style={styles.input}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={submit}>
          <Ionicons
            name={hasAuth ? "lock-open" : "lock-closed"}
            size={18}
            color={COLORS.background}
          />
          <Text style={styles.buttonText}>{hasAuth ? "Ouvrir" : "Activer"}</Text>
        </TouchableOpacity>

        {hasAuth && biometricAvailable ? (
          <TouchableOpacity style={styles.bioButton} onPress={tryBiometric}>
            <Ionicons name="finger-print" size={22} color={COLORS.accent} />
            <Text style={styles.bioText}>Utiliser empreinte</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.background,
  },
  content: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 18,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    backgroundColor: COLORS.cardBackground,
  },
  error: {
    alignSelf: "flex-start",
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  button: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    marginTop: 18,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "800",
  },
  bioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bioText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "600",
  },
});
