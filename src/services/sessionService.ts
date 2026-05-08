import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import * as Crypto from "expo-crypto";

import { vaultService } from "@/src/services/vaultService";
import { sha256 } from "@/src/utils/sha256";

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export interface GpsPoint {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
  altitude?: number;
}

export interface MarkedEvent {
  id: string;
  timestamp: number;
  location: GpsPoint;
  type:
    | "metal"
    | "noise"
    | "anomaly"
    | "other"
    | "auto"
    | "manual"
    | "find";
  classification?: string;
  signalStrength?: number;
  signal?: number;
  notes?: string;
  refilledAt?: number;
  dracReminderAt?: number;
  dracReminderSeenAt?: number;
  photoScale?: "none" | "coin" | "rule" | "hand";
  position?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
}

export interface Session {
  id: string;
  createdAt: number;
  startTime: number;
  endTime?: number;
  duration: number;
  distance: number;
  status: "active" | "paused" | "running" | "completed";
  gpsTrace: GpsPoint[];
  events: MarkedEvent[];
  metadata: {
    bleDetector?: string;
    temperatureAvg?: number;
    humidityAvg?: number;
    privateMode: boolean;
  };
  hash?: string;
  lockedAt?: number;
}

interface SessionRow {
  id: string;
  created_at: number;
  start_time: number;
  end_time: number | null;
  duration: number;
  distance: number;
  status: Session["status"];
  metadata_json: string;
  hash: string | null;
  locked_at: number | null;
}

interface GpsPointRow {
  session_id: string;
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
  altitude: number | null;
  point_order: number;
}

interface EventRow {
  id: string;
  session_id: string;
  timestamp: number;
  type: MarkedEvent["type"];
  lat: number;
  lon: number;
  accuracy: number;
  location_timestamp: number;
  altitude: number | null;
  classification: string | null;
  signal_strength: number | null;
  signal: number | null;
  notes: string | null;
  refilled_at: number | null;
  drac_reminder_at: number | null;
  drac_reminder_seen_at: number | null;
  photo_scale: MarkedEvent["photoScale"] | null;
  position_json: string | null;
}

class SessionService {
  private readonly DB_NAME = "walksense.db";
  private readonly LEGACY_STORAGE_KEY = "walksense_sessions";
  private db: SQLiteDatabase | null = null;
  private initPromise: Promise<SQLiteDatabase> | null = null;
  private currentSessionId: string | null = null;

  async createSession(): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: Crypto.randomUUID(),
      createdAt: now,
      startTime: now,
      duration: 0,
      distance: 0,
      status: "active",
      gpsTrace: [],
      events: [],
      metadata: {
        privateMode: false,
      },
    };

    const db = await this.getDb();
    await this.persistSession(db, session, true);
    this.currentSessionId = session.id;
    return session;
  }

  async saveSession(session: Session): Promise<void> {
    const db = await this.getDb();
    await this.persistSession(db, session, true);
  }

  async getSessions(): Promise<Session[]> {
    try {
      const db = await this.getDb();
      const rows = await db.getAllAsync<SessionRow>(
        "SELECT * FROM sessions ORDER BY start_time DESC",
      );
      return await this.hydrateSessions(db, rows);
    } catch (error) {
      console.error("SessionService.getSessions error:", error);
      return [];
    }
  }

  async getSessionById(id: string): Promise<Session | null> {
    try {
      const db = await this.getDb();
      return await this.getSessionByIdFromDb(db, id);
    } catch (error) {
      console.error("SessionService.getSessionById error:", error);
      return null;
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    try {
      const db = await this.getDb();

      if (this.currentSessionId) {
        const session = await this.getSessionByIdFromDb(db, this.currentSessionId);
        if (session) return session;
      }

      const row = await db.getFirstAsync<SessionRow>(
        `SELECT *
         FROM sessions
         WHERE status IN ('active', 'paused', 'running')
         ORDER BY start_time DESC
         LIMIT 1`,
      );

      if (!row) return null;
      this.currentSessionId = row.id;
      return await this.hydrateSession(db, row);
    } catch (error) {
      console.error("SessionService.getCurrentSession error:", error);
      return null;
    }
  }

  async pauseSession(): Promise<Session | null> {
    try {
      const session = await this.getCurrentSession();
      if (!session) return null;
      const updated: Session = { ...session, status: "paused" };
      const db = await this.getDb();
      await this.persistSessionRow(db, updated);
      return updated;
    } catch (error) {
      console.error("SessionService.pauseSession error:", error);
      return null;
    }
  }

  async resumeSession(): Promise<Session | null> {
    try {
      const session = await this.getCurrentSession();
      if (!session) return null;
      const updated: Session = { ...session, status: "active" };
      const db = await this.getDb();
      await this.persistSessionRow(db, updated);
      return updated;
    } catch (error) {
      console.error("SessionService.resumeSession error:", error);
      return null;
    }
  }

  async endSession(
    sessionId: string,
    data: {
      endTime: number;
      distance: number;
      duration: number;
    },
  ): Promise<Session | null> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) return null;

      const lockedAt = Date.now();
      const closed: Session = {
        ...session,
        status: "completed",
        endTime: data.endTime,
        distance: data.distance,
        duration: data.duration,
        lockedAt,
      };

      closed.hash = await sha256(this.buildCanonical(closed));

      const db = await this.getDb();
      await this.persistSessionRow(db, closed);
      this.currentSessionId = null;
      return closed;
    } catch (error) {
      console.error("SessionService.endSession error:", error);
      return null;
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.runAsync("DELETE FROM events WHERE session_id = ?", id);
      await db.runAsync("DELETE FROM gps_points WHERE session_id = ?", id);
      await db.runAsync("DELETE FROM sessions WHERE id = ?", id);
      if (this.currentSessionId === id) this.currentSessionId = null;
    } catch (error) {
      console.error("SessionService.deleteSession error:", error);
      throw error;
    }
  }

  async addEvent(sessionId: string, event: MarkedEvent): Promise<void> {
    try {
      const db = await this.getDb();
      const exists = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM sessions WHERE id = ?",
        sessionId,
      );
      if (!exists) {
        console.warn("addEvent: session not found", sessionId);
        return;
      }
      await this.insertEvent(db, sessionId, event);
    } catch (error) {
      console.error("SessionService.addEvent error:", error);
      throw error;
    }
  }

  async refillEvent(sessionId: string, eventId: string): Promise<void> {
    try {
      const db = await this.getDb();
      await db.runAsync(
        "UPDATE events SET refilled_at = ? WHERE session_id = ? AND id = ?",
        Date.now(),
        sessionId,
        eventId,
      );
    } catch (error) {
      console.error("SessionService.refillEvent error:", error);
      throw error;
    }
  }

  async classifyEvent(
    sessionId: string,
    eventId: string,
    classification: string,
    notes?: string,
    photoScale?: MarkedEvent["photoScale"],
  ): Promise<void> {
    try {
      const db = await this.getDb();
      const current = await db.getFirstAsync<EventRow>(
        "SELECT * FROM events WHERE session_id = ? AND id = ?",
        sessionId,
        eventId,
      );
      if (!current) return;

      const isArtifact = classification.toLowerCase() === "artefact";
      await db.runAsync(
        `UPDATE events
         SET classification = ?,
             notes = ?,
             photo_scale = ?,
             drac_reminder_at = ?,
             drac_reminder_seen_at = ?
         WHERE session_id = ? AND id = ?`,
        classification,
        notes ?? null,
        photoScale ?? null,
        isArtifact
          ? current.drac_reminder_at ?? Date.now() + 24 * 60 * 60 * 1000
          : null,
        isArtifact ? current.drac_reminder_seen_at : null,
        sessionId,
        eventId,
      );
    } catch (error) {
      console.error("SessionService.classifyEvent error:", error);
      throw error;
    }
  }

  async addGpsPoint(sessionId: string, point: GpsPoint): Promise<void> {
    try {
      const db = await this.getDb();
      const orderRow = await db.getFirstAsync<{ next_order: number }>(
        "SELECT COALESCE(MAX(point_order), -1) + 1 AS next_order FROM gps_points WHERE session_id = ?",
        sessionId,
      );
      await db.runAsync(
        `INSERT INTO gps_points (
          session_id, lat, lon, accuracy, timestamp, altitude, point_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        sessionId,
        point.lat,
        point.lon,
        point.accuracy,
        point.timestamp,
        point.altitude ?? null,
        orderRow?.next_order ?? 0,
      );
    } catch (error) {
      console.error("SessionService.addGpsPoint error:", error);
      throw error;
    }
  }

  async getDueDracReminders(now = Date.now()): Promise<
    { session: Session; event: MarkedEvent }[]
  > {
    const db = await this.getDb();
    const rows = await db.getAllAsync<
      EventRow & {
        session_created_at: number;
        session_start_time: number;
        session_end_time: number | null;
        session_duration: number;
        session_distance: number;
        session_status: Session["status"];
        session_metadata_json: string;
        session_hash: string | null;
        session_locked_at: number | null;
      }
    >(
      `SELECT
        e.*,
        s.created_at AS session_created_at,
        s.start_time AS session_start_time,
        s.end_time AS session_end_time,
        s.duration AS session_duration,
        s.distance AS session_distance,
        s.status AS session_status,
        s.metadata_json AS session_metadata_json,
        s.hash AS session_hash,
        s.locked_at AS session_locked_at
       FROM events e
       JOIN sessions s ON s.id = e.session_id
       WHERE e.drac_reminder_at IS NOT NULL
         AND e.drac_reminder_at <= ?
         AND e.drac_reminder_seen_at IS NULL
       ORDER BY e.drac_reminder_at ASC`,
      now,
    );

    return rows.map((row) => ({
      session: {
        id: row.session_id,
        createdAt: row.session_created_at,
        startTime: row.session_start_time,
        endTime: row.session_end_time ?? undefined,
        duration: row.session_duration,
        distance: row.session_distance,
        status: row.session_status,
        gpsTrace: [],
        events: [],
        metadata: parseJson(row.session_metadata_json, { privateMode: false }),
        hash: row.session_hash ?? undefined,
        lockedAt: row.session_locked_at ?? undefined,
      },
      event: this.eventFromRow(row),
    }));
  }

  async markDracReminderSeen(sessionId: string, eventId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      "UPDATE events SET drac_reminder_seen_at = ? WHERE session_id = ? AND id = ?",
      Date.now(),
      sessionId,
      eventId,
    );
  }

  calculateDistance(p1: GpsPoint, p2: GpsPoint): number {
    const R = 6371000;
    const dLat = this.toRad(p2.lat - p1.lat);
    const dLon = this.toRad(p2.lon - p1.lon);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(p1.lat)) *
        Math.cos(this.toRad(p2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async exportSessionJson(sessionId: string): Promise<string> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) throw new Error("Session not found");
      return JSON.stringify(session, null, 2);
    } catch (error) {
      console.error("SessionService.exportSessionJson error:", error);
      throw error;
    }
  }

  async exportSessionGpx(sessionId: string): Promise<string> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) throw new Error("Session not found");

      let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WalkSense">
  <metadata>
    <name>Session ${session.id}</name>
    <time>${new Date(session.startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>Trace GPS</name>
    <trkseg>
`;

      for (const point of session.gpsTrace) {
        gpx += `      <trkpt lat="${point.lat}" lon="${point.lon}">
        <ele>${point.altitude || 0}</ele>
        <time>${new Date(point.timestamp).toISOString()}</time>
        <accuracy>${point.accuracy}</accuracy>
      </trkpt>\n`;
      }

      gpx += `    </trkseg>
  </trk>`;

      for (const event of session.events) {
        const lat = event.position?.latitude ?? event.location.lat;
        const lon = event.position?.longitude ?? event.location.lon;
        gpx += `
  <wpt lat="${lat}" lon="${lon}">
    <name>${event.type} - ${event.classification || "non classe"}</name>
    <time>${new Date(event.timestamp).toISOString()}</time>
    <desc>${event.notes || ""}</desc>
  </wpt>`;
      }

      gpx += `\n</gpx>`;
      return gpx;
    } catch (error) {
      console.error("SessionService.exportSessionGpx error:", error);
      throw error;
    }
  }

  async getSessionStats(sessionId: string): Promise<{
    duration: number;
    distance: number;
    eventCount: number;
    classifiedCount: number;
    avgSpeed: number;
  } | null> {
    try {
      const db = await this.getDb();
      const session = await this.getSessionByIdFromDb(db, sessionId);
      if (!session) return null;

      const counts = await db.getFirstAsync<{
        event_count: number;
        classified_count: number;
      }>(
        `SELECT
          COUNT(*) AS event_count,
          SUM(CASE WHEN classification IS NOT NULL THEN 1 ELSE 0 END) AS classified_count
         FROM events
         WHERE session_id = ?`,
        sessionId,
      );

      const avgSpeed =
        session.duration > 0
          ? session.distance / 1000 / (session.duration / 3600)
          : 0;

      return {
        duration: session.duration,
        distance: session.distance,
        eventCount: counts?.event_count ?? 0,
        classifiedCount: counts?.classified_count ?? 0,
        avgSpeed,
      };
    } catch (error) {
      console.error("SessionService.getSessionStats error:", error);
      return null;
    }
  }

  private async getDb(): Promise<SQLiteDatabase> {
    if (this.db) return this.db;
    if (!this.initPromise) {
      this.initPromise = this.initDb();
    }
    this.db = await this.initPromise;
    return this.db;
  }

  private async initDb(): Promise<SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync(this.DB_NAME);
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        created_at INTEGER NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration INTEGER NOT NULL DEFAULT 0,
        distance REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        hash TEXT,
        locked_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS gps_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        accuracy REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        altitude REAL,
        point_order INTEGER NOT NULL,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_gps_points_session_order
        ON gps_points(session_id, point_order);
      CREATE INDEX IF NOT EXISTS idx_gps_points_session_timestamp
        ON gps_points(session_id, timestamp);

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        accuracy REAL NOT NULL,
        location_timestamp INTEGER NOT NULL,
        altitude REAL,
        classification TEXT,
        signal_strength REAL,
        signal REAL,
        notes TEXT,
        refilled_at INTEGER,
        drac_reminder_at INTEGER,
        drac_reminder_seen_at INTEGER,
        photo_scale TEXT,
        position_json TEXT,
        FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_events_session_timestamp
        ON events(session_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_drac
        ON events(drac_reminder_at, drac_reminder_seen_at);

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);

    await this.migrateLegacyStorage(db);
    return db;
  }

  private async migrateLegacyStorage(db: SQLiteDatabase): Promise<void> {
    const migrated = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'legacy_vault_migrated'",
    );
    if (migrated?.value === "1") return;

    const legacySessions = await vaultService.getJson<Session[]>(
      this.LEGACY_STORAGE_KEY,
      [],
    );

    if (legacySessions.length > 0) {
      await db.withTransactionAsync(async () => {
        for (const session of legacySessions) {
          await this.persistSession(db, session, true);
        }
        await db.runAsync(
          "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('legacy_vault_migrated', '1')",
        );
      });
      await vaultService.remove(this.LEGACY_STORAGE_KEY);
      return;
    }

    await db.runAsync(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('legacy_vault_migrated', '1')",
    );
  }

  private async getSessionByIdFromDb(
    db: SQLiteDatabase,
    id: string,
  ): Promise<Session | null> {
    const row = await db.getFirstAsync<SessionRow>(
      "SELECT * FROM sessions WHERE id = ?",
      id,
    );
    return row ? this.hydrateSession(db, row) : null;
  }

  private async hydrateSessions(
    db: SQLiteDatabase,
    rows: SessionRow[],
  ): Promise<Session[]> {
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    const placeholders = ids.map(() => "?").join(",");
    const gpsRows = await db.getAllAsync<GpsPointRow>(
      `SELECT * FROM gps_points
       WHERE session_id IN (${placeholders})
       ORDER BY session_id, point_order ASC`,
      ids,
    );
    const eventRows = await db.getAllAsync<EventRow>(
      `SELECT * FROM events
       WHERE session_id IN (${placeholders})
       ORDER BY session_id, timestamp ASC`,
      ids,
    );

    const gpsBySession = new Map<string, GpsPoint[]>();
    gpsRows.forEach((row) => {
      const list = gpsBySession.get(row.session_id) ?? [];
      list.push(this.gpsPointFromRow(row));
      gpsBySession.set(row.session_id, list);
    });

    const eventsBySession = new Map<string, MarkedEvent[]>();
    eventRows.forEach((row) => {
      const list = eventsBySession.get(row.session_id) ?? [];
      list.push(this.eventFromRow(row));
      eventsBySession.set(row.session_id, list);
    });

    return rows.map((row) =>
      this.sessionFromRow(
        row,
        gpsBySession.get(row.id) ?? [],
        eventsBySession.get(row.id) ?? [],
      ),
    );
  }

  private async hydrateSession(
    db: SQLiteDatabase,
    row: SessionRow,
  ): Promise<Session> {
    const gpsRows = await db.getAllAsync<GpsPointRow>(
      "SELECT * FROM gps_points WHERE session_id = ? ORDER BY point_order ASC",
      row.id,
    );
    const eventRows = await db.getAllAsync<EventRow>(
      "SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC",
      row.id,
    );
    return this.sessionFromRow(
      row,
      gpsRows.map((gpsRow) => this.gpsPointFromRow(gpsRow)),
      eventRows.map((eventRow) => this.eventFromRow(eventRow)),
    );
  }

  private async persistSession(
    db: SQLiteDatabase,
    session: Session,
    replaceChildren: boolean,
  ): Promise<void> {
    await db.withTransactionAsync(async () => {
      await this.persistSessionRow(db, session);
      if (!replaceChildren) return;

      await db.runAsync("DELETE FROM gps_points WHERE session_id = ?", session.id);
      await db.runAsync("DELETE FROM events WHERE session_id = ?", session.id);

      for (let i = 0; i < session.gpsTrace.length; i += 1) {
        await this.insertGpsPoint(db, session.id, session.gpsTrace[i], i);
      }
      for (const event of session.events) {
        await this.insertEvent(db, session.id, event);
      }
    });
  }

  private async persistSessionRow(
    db: SQLiteDatabase,
    session: Session,
  ): Promise<void> {
    await db.runAsync(
      `INSERT INTO sessions (
        id, created_at, start_time, end_time, duration, distance,
        status, metadata_json, hash, locked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        created_at = excluded.created_at,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        duration = excluded.duration,
        distance = excluded.distance,
        status = excluded.status,
        metadata_json = excluded.metadata_json,
        hash = excluded.hash,
        locked_at = excluded.locked_at`,
      session.id,
      session.createdAt,
      session.startTime,
      session.endTime ?? null,
      session.duration,
      session.distance,
      session.status,
      JSON.stringify(session.metadata),
      session.hash ?? null,
      session.lockedAt ?? null,
    );
  }

  private async insertGpsPoint(
    db: SQLiteDatabase,
    sessionId: string,
    point: GpsPoint,
    pointOrder: number,
  ): Promise<void> {
    await db.runAsync(
      `INSERT INTO gps_points (
        session_id, lat, lon, accuracy, timestamp, altitude, point_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      point.lat,
      point.lon,
      point.accuracy,
      point.timestamp,
      point.altitude ?? null,
      pointOrder,
    );
  }

  private async insertEvent(
    db: SQLiteDatabase,
    sessionId: string,
    event: MarkedEvent,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO events (
        id, session_id, timestamp, type, lat, lon, accuracy,
        location_timestamp, altitude, classification, signal_strength,
        signal, notes, refilled_at, drac_reminder_at, drac_reminder_seen_at,
        photo_scale, position_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      event.id,
      sessionId,
      event.timestamp,
      event.type,
      event.location.lat,
      event.location.lon,
      event.location.accuracy,
      event.location.timestamp,
      event.location.altitude ?? null,
      event.classification ?? null,
      event.signalStrength ?? null,
      event.signal ?? null,
      event.notes ?? null,
      event.refilledAt ?? null,
      event.dracReminderAt ?? null,
      event.dracReminderSeenAt ?? null,
      event.photoScale ?? null,
      event.position ? JSON.stringify(event.position) : null,
    );
  }

  private sessionFromRow(
    row: SessionRow,
    gpsTrace: GpsPoint[],
    events: MarkedEvent[],
  ): Session {
    return {
      id: row.id,
      createdAt: row.created_at,
      startTime: row.start_time,
      endTime: row.end_time ?? undefined,
      duration: row.duration,
      distance: row.distance,
      status: row.status,
      gpsTrace,
      events,
      metadata: parseJson(row.metadata_json, { privateMode: false }),
      hash: row.hash ?? undefined,
      lockedAt: row.locked_at ?? undefined,
    };
  }

  private gpsPointFromRow(row: GpsPointRow): GpsPoint {
    return {
      lat: row.lat,
      lon: row.lon,
      accuracy: row.accuracy,
      timestamp: row.timestamp,
      altitude: row.altitude ?? undefined,
    };
  }

  private eventFromRow(row: EventRow): MarkedEvent {
    return {
      id: row.id,
      timestamp: row.timestamp,
      type: row.type,
      location: {
        lat: row.lat,
        lon: row.lon,
        accuracy: row.accuracy,
        timestamp: row.location_timestamp,
        altitude: row.altitude ?? undefined,
      },
      classification: row.classification ?? undefined,
      signalStrength: row.signal_strength ?? undefined,
      signal: row.signal ?? undefined,
      notes: row.notes ?? undefined,
      refilledAt: row.refilled_at ?? undefined,
      dracReminderAt: row.drac_reminder_at ?? undefined,
      dracReminderSeenAt: row.drac_reminder_seen_at ?? undefined,
      photoScale: row.photo_scale ?? undefined,
      position: parseJson(row.position_json, undefined),
    };
  }

  private buildCanonical(session: Session): string {
    return JSON.stringify({
      v: "1.0",
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      distance: Math.round(session.distance * 1000) / 1000,
      lockedAt: session.lockedAt,
      events: session.events.map((event) => ({
        id: event.id,
        ts: event.timestamp,
        type: event.type,
        lat: event.location.lat,
        lon: event.location.lon,
        classification: event.classification ?? null,
        refilledAt: event.refilledAt ?? null,
        photoScale: event.photoScale ?? null,
        dracReminderAt: event.dracReminderAt ?? null,
      })),
      gpsPoints: session.gpsTrace.length,
    });
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}

export const sessionService = new SessionService();
