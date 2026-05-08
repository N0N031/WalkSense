import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

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

class AuthService {
  private unlockedPasscode: string | null = null;

  async isOnboardingDone() {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === "1";
  }

  async completeOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
  }

  async getProfile(): Promise<AuthProfile | null> {
    const raw = await SecureStore.getItemAsync(PROFILE_KEY);
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
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
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

}

export const authService = new AuthService();

export async function migrateAuthToSecureStoreIfNeeded(): Promise<void> {
  const current = await SecureStore.getItemAsync(PROFILE_KEY);
  if (current) return;

  const legacy = await AsyncStorage.getItem(PROFILE_KEY);
  if (!legacy) return;

  await SecureStore.setItemAsync(PROFILE_KEY, legacy);
  await AsyncStorage.removeItem(PROFILE_KEY);
}
