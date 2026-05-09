import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const DISTANCE_MIGRATION_FLAG = "walksense_distance_km_to_meters_v1";

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("walksense.db").then(async (db) => {
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync("PRAGMA foreign_keys = ON;");
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const hadSnakeCaseSchema = await migrateSnakeCaseSchemaIfNeeded(db);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      createdAt INTEGER NOT NULL,
      startTime INTEGER NOT NULL,
      endTime INTEGER,
      duration INTEGER NOT NULL DEFAULT 0,
      distance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      hash TEXT,
      lockedAt INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_createdAt ON sessions(createdAt DESC);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      accuracy REAL NOT NULL,
      altitude REAL,
      type TEXT NOT NULL,
      classification TEXT,
      signalStrength REAL,
      notes TEXT,
      refilledAt INTEGER,
      dracReminderAt INTEGER,
      dracReminderSeenAt INTEGER,
      photoScale TEXT,
      signal REAL,
      position TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_drac ON events(dracReminderAt)
      WHERE dracReminderAt IS NOT NULL AND dracReminderSeenAt IS NULL;

    CREATE TABLE IF NOT EXISTS gps_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      accuracy REAL NOT NULL,
      accuracyMeters REAL NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL,
      altitude REAL,
      speedMps REAL,
      confidenceLevel TEXT NOT NULL DEFAULT 'LOW',
      bearingDeg REAL,
      satellitesCount INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_gps_session ON gps_points(session_id, timestamp);

  `);

  await ensureGpsPointGridColumns(db);

  if (hadSnakeCaseSchema) {
    await db.execAsync(`
      INSERT OR IGNORE INTO sessions (
        id, createdAt, startTime, endTime, duration, distance, status, metadata, hash, lockedAt
      )
      SELECT
        id, created_at, start_time, end_time, duration, distance, status,
        metadata_json, hash, locked_at
      FROM sessions_legacy_snake;

      INSERT INTO gps_points (
        session_id, lat, lon, accuracy, accuracyMeters, timestamp, altitude,
        speedMps, confidenceLevel, bearingDeg, satellitesCount
      )
      SELECT
        session_id, lat, lon, accuracy, accuracy, timestamp, altitude,
        NULL, 'LOW', NULL, NULL
      FROM gps_points_legacy_snake
      ORDER BY session_id, point_order ASC;

      INSERT OR IGNORE INTO events (
        id, session_id, timestamp, lat, lon, accuracy, altitude, type,
        classification, signalStrength, notes, refilledAt, dracReminderAt,
        dracReminderSeenAt, photoScale, signal, position
      )
      SELECT
        id, session_id, timestamp, lat, lon, accuracy, altitude, type,
        classification, signal_strength, notes, refilled_at, drac_reminder_at,
        drac_reminder_seen_at, photo_scale, signal, position_json
      FROM events_legacy_snake;

      DROP TABLE IF EXISTS events_legacy_snake;
      DROP TABLE IF EXISTS gps_points_legacy_snake;
      DROP TABLE IF EXISTS sessions_legacy_snake;
    `);
  }
}

async function ensureGpsPointGridColumns(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(gps_points)",
  );
  const names = new Set(columns.map((column) => column.name));

  const migrations: string[] = [];
  if (!names.has("accuracyMeters")) {
    migrations.push(
      "ALTER TABLE gps_points ADD COLUMN accuracyMeters REAL NOT NULL DEFAULT 0",
    );
  }
  if (!names.has("speedMps")) {
    migrations.push("ALTER TABLE gps_points ADD COLUMN speedMps REAL");
  }
  if (!names.has("confidenceLevel")) {
    migrations.push(
      "ALTER TABLE gps_points ADD COLUMN confidenceLevel TEXT NOT NULL DEFAULT 'LOW'",
    );
  }
  if (!names.has("bearingDeg")) {
    migrations.push("ALTER TABLE gps_points ADD COLUMN bearingDeg REAL");
  }
  if (!names.has("satellitesCount")) {
    migrations.push("ALTER TABLE gps_points ADD COLUMN satellitesCount INTEGER");
  }

  for (const statement of migrations) {
    await db.execAsync(statement);
  }

  if (!names.has("accuracyMeters")) {
    await db.runAsync(
      "UPDATE gps_points SET accuracyMeters = accuracy WHERE accuracyMeters = 0",
    );
  }
}

async function migrateSnakeCaseSchemaIfNeeded(
  db: SQLite.SQLiteDatabase,
): Promise<boolean> {
  const sessionColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(sessions)",
  );
  const hasSnakeCaseSchema = sessionColumns.some((column) =>
    column.name === "created_at",
  );
  const hasCamelCaseSchema = sessionColumns.some((column) =>
    column.name === "createdAt",
  );

  if (!hasSnakeCaseSchema || hasCamelCaseSchema) return false;

  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    ALTER TABLE sessions RENAME TO sessions_legacy_snake;
    ALTER TABLE gps_points RENAME TO gps_points_legacy_snake;
    ALTER TABLE events RENAME TO events_legacy_snake;
    PRAGMA foreign_keys = ON;
  `);

  return true;
}

export async function migrateDistancesKmToMetersIfNeeded(): Promise<void> {
  const done = await AsyncStorage.getItem(DISTANCE_MIGRATION_FLAG);
  if (done === "1") return;

  const db = await getDb();
  await db.runAsync("UPDATE sessions SET distance = distance * 1000");
  await AsyncStorage.setItem(DISTANCE_MIGRATION_FLAG, "1");
}
