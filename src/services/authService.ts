import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { sha256 } from "@/src/utils/sha256";

const PROFILE_KEY = "walksense_auth_profile";
const ONBOARDING_KEY = "walksense_onboarding_done";

export interface AuthProfile {
  salt: string;
  passcodeHash: string;
  createdAt: number;
}

function makeSalt() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function hashPasscode(passcode: string, salt: string): Promise<string> {
  return await sha256(`${salt}:${passcode}`);
}

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function getAuthProfileRaw(): Promise<string | null> {
  if (await canUseSecureStore()) {
    return await SecureStore.getItemAsync(PROFILE_KEY);
  }
  return await AsyncStorage.getItem(PROFILE_KEY);
}

async function setAuthProfileRaw(value: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(PROFILE_KEY, value);
    return;
  }
  await AsyncStorage.setItem(PROFILE_KEY, value);
}

class AuthService {
  private unlockedPasscode: string | null = null;

  async isOnboardingDone() {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === "1";
  }

  async completeOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
  }

  async getProfile(): Promise<AuthProfile | null> {
    const raw = await getAuthProfileRaw();
    return raw ? JSON.parse(raw) : null;
  }

  async hasAuth() {
    return Boolean(await this.getProfile());
  }

  async setup(passcode: string) {
    const salt = makeSalt();
    const profile: AuthProfile = {
      salt,
      passcodeHash: await hashPasscode(passcode, salt),
      createdAt: Date.now(),
    };
    await setAuthProfileRaw(JSON.stringify(profile));
    this.unlockedPasscode = passcode;
    return profile;
  }

  async unlock(passcode: string) {
    const profile = await this.getProfile();
    if (!profile) return false;
    const candidate = await hashPasscode(passcode, profile.salt);
    const ok = candidate === profile.passcodeHash;
    if (ok) this.unlockedPasscode = passcode;
    return ok;
  }

  lock() {
    this.unlockedPasscode = null;
  }

  isUnlocked() {
    return Boolean(this.unlockedPasscode);
  }

  async isBiometricAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  }

  async unlockWithBiometrics(): Promise<boolean> {
    const available = await this.isBiometricAvailable();
    if (!available) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Déverrouiller WalkSense",
      cancelLabel: "Code",
      disableDeviceFallback: true,
    });

    if (result.success) {
      this.unlockedPasscode = "__biometric__";
    }
    return result.success;
  }

}

export const authService = new AuthService();

export async function migrateAuthToSecureStoreIfNeeded(): Promise<void> {
  if (!(await canUseSecureStore())) return;

  const current = await SecureStore.getItemAsync(PROFILE_KEY);
  if (current) return;

  const legacy = await AsyncStorage.getItem(PROFILE_KEY);
  if (!legacy) return;

  await SecureStore.setItemAsync(PROFILE_KEY, legacy);
  await AsyncStorage.removeItem(PROFILE_KEY);
}
