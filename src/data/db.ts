import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

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
      timestamp INTEGER NOT NULL,
      altitude REAL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_gps_session ON gps_points(session_id, timestamp);
  `);
}
