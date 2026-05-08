import { getDb } from "@/src/data/db";
import {
  type CoverageCellEntity,
  gpsPointEntityToPoint,
  gpsPointToEntity,
  type ConfidenceLevel,
} from "@/src/data/gridEntities";
import type {
  GpsPoint,
  MarkedEvent,
  Session,
} from "@/src/services/sessionService";

type SessionRow = {
  id: string;
  createdAt: number;
  startTime: number;
  endTime: number | null;
  duration: number;
  distance: number;
  status: Session["status"];
  metadata: string;
  hash: string | null;
  lockedAt: number | null;
};

type GpsPointRow = {
  id?: number;
  session_id?: string;
  lat: number;
  lon: number;
  accuracy: number;
  accuracyMeters: number;
  timestamp: number;
  altitude: number | null;
  speedMps: number | null;
  confidenceLevel: ConfidenceLevel;
  bearingDeg: number | null;
  satellitesCount: number | null;
};

type EventRow = {
  id: string;
  timestamp: number;
  lat: number;
  lon: number;
  accuracy: number;
  altitude: number | null;
  type: MarkedEvent["type"];
  classification: string | null;
  signalStrength: number | null;
  notes: string | null;
  refilledAt: number | null;
  dracReminderAt: number | null;
  dracReminderSeenAt: number | null;
  photoScale: MarkedEvent["photoScale"] | null;
  signal: number | null;
  position: string | null;
  session_id?: string;
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

class SessionRepository {
  async insertSession(session: Session): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await this.upsertSessionRow(session);
    });
  }

  async updateSession(session: Session): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await this.upsertSessionRow(session);
      await db.runAsync("DELETE FROM gps_points WHERE session_id = ?", session.id);
      await db.runAsync("DELETE FROM events WHERE session_id = ?", session.id);
      for (const point of session.gpsTrace) {
        await this.insertGpsPointRow(session.id, point);
      }
      for (const event of session.events) {
        await this.upsertEventRow(session.id, event);
      }
    });
  }

  async getAllSessions(): Promise<Session[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<SessionRow>(
      "SELECT * FROM sessions ORDER BY startTime DESC",
    );
    return await this.hydrateSessions(rows);
  }

  async getSessionById(id: string): Promise<Session | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<SessionRow>(
      "SELECT * FROM sessions WHERE id = ?",
      id,
    );
    return row ? await this.hydrateSession(row) : null;
  }

  async findActiveSession(): Promise<Session | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<SessionRow>(
      `SELECT *
       FROM sessions
       WHERE status IN ('active', 'paused', 'running')
       ORDER BY startTime DESC
       LIMIT 1`,
    );
    return row ? await this.hydrateSession(row) : null;
  }

  async deleteSession(id: string): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM sessions WHERE id = ?", id);
    });
  }

  async insertEvent(sessionId: string, event: MarkedEvent): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await this.upsertEventRow(sessionId, event);
    });
  }

  async updateEvent(sessionId: string, event: MarkedEvent): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await this.upsertEventRow(sessionId, event);
    });
  }

  async insertGpsPoint(sessionId: string, point: GpsPoint): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await this.insertGpsPointRow(sessionId, point);
    });
  }

  async updateSessionLock(
    id: string,
    hash: string,
    lockedAt: number,
    endTime: number,
    duration: number,
    distance: number,
  ): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE sessions
         SET hash = ?, lockedAt = ?, endTime = ?, duration = ?, distance = ?, status = 'completed'
         WHERE id = ?`,
        hash,
        lockedAt,
        endTime,
        duration,
        distance,
        id,
      );
    });
  }

  async getDueDracReminders(
    now: number,
  ): Promise<{ sessionId: string; eventId: string }[]> {
    const db = await getDb();
    return await db.getAllAsync<{ sessionId: string; eventId: string }>(
      `SELECT session_id AS sessionId, id AS eventId
       FROM events
       WHERE dracReminderAt IS NOT NULL
         AND dracReminderAt <= ?
         AND dracReminderSeenAt IS NULL
       ORDER BY dracReminderAt ASC`,
      now,
    );
  }

  async upsertCoverageCells(cells: CoverageCellEntity[]): Promise<void> {
    if (cells.length === 0) return;

    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const cell of cells) {
        await db.runAsync(
          `INSERT INTO coverage_cells (
            cellId, sessionId, centerLat, centerLon, cellSizeMeter,
            radiusUsedMeters, confidenceLevel, confidenceSource, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(cellId) DO UPDATE SET
            sessionId = excluded.sessionId,
            centerLat = excluded.centerLat,
            centerLon = excluded.centerLon,
            cellSizeMeter = excluded.cellSizeMeter,
            radiusUsedMeters = excluded.radiusUsedMeters,
            confidenceLevel = excluded.confidenceLevel,
            confidenceSource = excluded.confidenceSource,
            timestamp = excluded.timestamp`,
          cell.cellId,
          cell.sessionId,
          cell.centerLat,
          cell.centerLon,
          cell.cellSizeMeter,
          cell.radiusUsedMeters,
          cell.confidenceLevel,
          cell.confidenceSource,
          cell.timestamp,
        );
      }
    });
  }

  async getCoverageCellsBySession(
    sessionId: string,
    limit = 100,
  ): Promise<CoverageCellEntity[]> {
    const db = await getDb();
    return await db.getAllAsync<CoverageCellEntity>(
      `SELECT *
       FROM coverage_cells
       WHERE sessionId = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      sessionId,
      limit,
    );
  }

  private async hydrateSessions(rows: SessionRow[]): Promise<Session[]> {
    if (rows.length === 0) return [];

    const db = await getDb();
    const ids = rows.map((row) => row.id);
    const placeholders = ids.map(() => "?").join(",");

    // Child rows are loaded in two batched queries to avoid duplicating session rows via joins.
    const gpsRows = await db.getAllAsync<GpsPointRow & { session_id: string }>(
      `SELECT
        session_id, lat, lon, accuracy, accuracyMeters, timestamp, altitude,
        speedMps, confidenceLevel, bearingDeg, satellitesCount
       FROM gps_points
       WHERE session_id IN (${placeholders})
       ORDER BY session_id, timestamp ASC`,
      ids,
    );
    const eventRows = await db.getAllAsync<EventRow>(
      `SELECT *
       FROM events
       WHERE session_id IN (${placeholders})
       ORDER BY session_id, timestamp ASC`,
      ids,
    );

    const gpsBySession = new Map<string, GpsPoint[]>();
    for (const row of gpsRows) {
      const list = gpsBySession.get(row.session_id) ?? [];
      list.push(this.gpsPointFromRow(row));
      gpsBySession.set(row.session_id, list);
    }

    const eventsBySession = new Map<string, MarkedEvent[]>();
    for (const row of eventRows) {
      if (!row.session_id) continue;
      const list = eventsBySession.get(row.session_id) ?? [];
      list.push(this.eventFromRow(row));
      eventsBySession.set(row.session_id, list);
    }

    return rows.map((row) =>
      this.sessionFromRow(
        row,
        gpsBySession.get(row.id) ?? [],
        eventsBySession.get(row.id) ?? [],
      ),
    );
  }

  private async hydrateSession(row: SessionRow): Promise<Session> {
    const db = await getDb();
    const gpsRows = await db.getAllAsync<GpsPointRow>(
      `SELECT
        lat, lon, accuracy, accuracyMeters, timestamp, altitude,
        speedMps, confidenceLevel, bearingDeg, satellitesCount
       FROM gps_points
       WHERE session_id = ?
       ORDER BY timestamp ASC`,
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

  private async upsertSessionRow(session: Session): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sessions (
        id, createdAt, startTime, endTime, duration, distance, status, metadata, hash, lockedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        createdAt = excluded.createdAt,
        startTime = excluded.startTime,
        endTime = excluded.endTime,
        duration = excluded.duration,
        distance = excluded.distance,
        status = excluded.status,
        metadata = excluded.metadata,
        hash = excluded.hash,
        lockedAt = excluded.lockedAt`,
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

  private async insertGpsPointRow(
    sessionId: string,
    point: GpsPoint,
  ): Promise<void> {
    const db = await getDb();
    const entity = gpsPointToEntity(sessionId, point);
    await db.runAsync(
      `INSERT INTO gps_points (
        session_id, lat, lon, accuracy, accuracyMeters, timestamp, altitude,
        speedMps, confidenceLevel, bearingDeg, satellitesCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      entity.sessionId,
      entity.lat,
      entity.lon,
      entity.accuracy,
      entity.accuracyMeters,
      entity.timestamp,
      entity.altitude,
      entity.speedMps,
      entity.confidenceLevel,
      entity.bearingDeg,
      entity.satellitesCount,
    );
  }

  private async upsertEventRow(
    sessionId: string,
    event: MarkedEvent,
  ): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO events (
        id, session_id, timestamp, lat, lon, accuracy, altitude, type,
        classification, signalStrength, notes, refilledAt, dracReminderAt,
        dracReminderSeenAt, photoScale, signal, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        session_id = excluded.session_id,
        timestamp = excluded.timestamp,
        lat = excluded.lat,
        lon = excluded.lon,
        accuracy = excluded.accuracy,
        altitude = excluded.altitude,
        type = excluded.type,
        classification = excluded.classification,
        signalStrength = excluded.signalStrength,
        notes = excluded.notes,
        refilledAt = excluded.refilledAt,
        dracReminderAt = excluded.dracReminderAt,
        dracReminderSeenAt = excluded.dracReminderSeenAt,
        photoScale = excluded.photoScale,
        signal = excluded.signal,
        position = excluded.position`,
      event.id,
      sessionId,
      event.timestamp,
      event.location.lat,
      event.location.lon,
      event.location.accuracy,
      event.location.altitude ?? null,
      event.type,
      event.classification ?? null,
      event.signalStrength ?? null,
      event.notes ?? null,
      event.refilledAt ?? null,
      event.dracReminderAt ?? null,
      event.dracReminderSeenAt ?? null,
      event.photoScale ?? null,
      event.signal ?? null,
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
      createdAt: row.createdAt,
      startTime: row.startTime,
      endTime: row.endTime ?? undefined,
      duration: row.duration,
      distance: row.distance,
      status: row.status,
      gpsTrace,
      events,
      metadata: parseJson(row.metadata, { privateMode: false }),
      hash: row.hash ?? undefined,
      lockedAt: row.lockedAt ?? undefined,
      coverageCells: [],
      lastGridUpdateMs: 0,
      gridUpdateInterval: 500,
    };
  }

  private gpsPointFromRow(row: GpsPointRow): GpsPoint {
    return gpsPointEntityToPoint({
      sessionId: row.session_id ?? "",
      lat: row.lat,
      lon: row.lon,
      accuracy: row.accuracy,
      accuracyMeters: row.accuracyMeters,
      timestamp: row.timestamp,
      altitude: row.altitude,
      speedMps: row.speedMps,
      confidenceLevel: row.confidenceLevel,
      bearingDeg: row.bearingDeg,
      satellitesCount: row.satellitesCount,
    });
  }

  private eventFromRow(row: EventRow): MarkedEvent {
    const location = {
      lat: row.lat,
      lon: row.lon,
      accuracy: row.accuracy,
      timestamp: row.timestamp,
      altitude: row.altitude ?? undefined,
    };

    return {
      id: row.id,
      timestamp: row.timestamp,
      location,
      type: row.type,
      classification: row.classification ?? undefined,
      signalStrength: row.signalStrength ?? undefined,
      signal: row.signal ?? undefined,
      notes: row.notes ?? undefined,
      refilledAt: row.refilledAt ?? undefined,
      dracReminderAt: row.dracReminderAt ?? undefined,
      dracReminderSeenAt: row.dracReminderSeenAt ?? undefined,
      photoScale: row.photoScale ?? undefined,
      position: parseJson(row.position, undefined),
    };
  }
}

export const sessionRepository = new SessionRepository();
