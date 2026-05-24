import AsyncStorage from "@react-native-async-storage/async-storage";

import { sessionRepository } from "@/src/data/sessionRepository";
import type { Session } from "@/src/services/sessionService";

const MIGRATION_FLAG = "walksense_migrated_to_sqlite_v1";

export async function migrateVaultToSqliteIfNeeded(): Promise<void> {
  const done = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (done === "1") return;

  try {
    const raw = await AsyncStorage.getItem("walksense_sessions");
    const sessions = raw ? (JSON.parse(raw) as Session[]) : [];

    for (const session of sessions) {
      await sessionRepository.insertSession(session);
      for (const point of session.gpsTrace) {
        await sessionRepository.insertGpsPoint(session.id, point);
      }
      for (const event of session.events) {
        await sessionRepository.insertEvent(session.id, event);
      }
    }

    await AsyncStorage.setItem(MIGRATION_FLAG, "1");
    await AsyncStorage.removeItem("walksense_sessions");
    console.log(`[migration] Migrated ${sessions.length} session(s) to SQLite.`);
  } catch (error) {
    console.error("[migration] Failed:", error);
  }
}
