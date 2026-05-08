import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "@/src/services/authService";
import { sha256 } from "@/src/utils/sha256";

const PREFIX = "walksense_vault:";

function hexToBytes(hex: string) {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}

function bytesToBase64(bytes: number[]) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Array.from(binary).map((char) => char.charCodeAt(0));
}

async function keystream(secret: string, nonce: string, length: number) {
  const bytes: number[] = [];
  let counter = 0;
  while (bytes.length < length) {
    const block = sha256(`${secret}:${nonce}:${counter}`);
    bytes.push(...hexToBytes(block));
    counter += 1;
  }
  return bytes.slice(0, length);
}

async function crypt(value: string, secret: string, nonce: string) {
  const plain = Array.from(unescape(encodeURIComponent(value))).map((char) =>
    char.charCodeAt(0),
  );
  const stream = await keystream(secret, nonce, plain.length);
  return bytesToBase64(plain.map((byte, index) => byte ^ stream[index]));
}

async function decrypt(value: string, secret: string, nonce: string) {
  const encrypted = base64ToBytes(value);
  const stream = await keystream(secret, nonce, encrypted.length);
  const decoded = encrypted.map((byte, index) => byte ^ stream[index]);
  return decodeURIComponent(
    escape(String.fromCharCode(...decoded)),
  );
}

class VaultService {
  async setJson<T>(key: string, value: T) {
    const secret = authService.getVaultSecret();
    const json = JSON.stringify(value);

    if (!secret) {
      await AsyncStorage.setItem(key, json);
      return;
    }

    const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const payload = {
      v: 1,
      nonce,
      data: await crypt(json, secret, nonce),
    };
    await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(payload));
    await AsyncStorage.removeItem(key);
  }

  async getJson<T>(key: string, fallback: T): Promise<T> {
    const encrypted = await AsyncStorage.getItem(`${PREFIX}${key}`);
    if (encrypted) {
      const secret = authService.getVaultSecret();
      if (!secret) return fallback;
      const payload = JSON.parse(encrypted);
      return JSON.parse(await decrypt(payload.data, secret, payload.nonce));
    }

    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }

  async remove(key: string) {
    await AsyncStorage.multiRemove([key, `${PREFIX}${key}`]);
  }
}

export const vaultService = new VaultService();
