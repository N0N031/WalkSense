import * as Crypto from "expo-crypto";

import { sessionRepository } from "@/src/data/sessionRepository";
import { sha256 } from "@/src/utils/sha256";

export interface GpsPoint {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
  altitude?: number;
  accuracyMeters?: number;
  speedMps?: number;
  confidenceLevel?: "HIGH" | "MEDIUM" | "LOW";
  bearingDeg?: number;
  satellitesCount?: number;
}

export interface MarkedEvent {
  id: string;
  timestamp: number;
  location: GpsPoint;
  type: "metal" | "noise" | "anomaly" | "other" | "auto" | "manual" | "find";
  classification?: string;
  signalStrength?: number;
  signal?: number;
  notes?: string;
  refilledAt?: number;
  dracReminderAt?: number;
  dracReminderSeenAt?: number;
  photoScale?: "none" | "coin" | "rule" | "hand";
  photoUri?: string;
  position?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
}

export interface Session {
  id: string;
  name?: string;
  commune?: string;
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

class SessionService {
  private currentSessionId: string | null = null;

  async createSession(input?: {
    name?: string;
    commune?: string;
  }): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: Crypto.randomUUID(),
      name: input?.name,
      commune: input?.commune,
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

    await sessionRepository.insertSession(session);
    this.currentSessionId = session.id;
    return session;
  }

  async saveSession(session: Session): Promise<void> {
    await sessionRepository.updateSession(session);
  }

  async updateSessionMeta(id: string, name: string): Promise<void> {
    await sessionRepository.updateSessionMeta(id, name);
  }

  async updateSessionCommune(id: string, commune: string): Promise<void> {
    await sessionRepository.updateSessionCommune(id, commune);
  }

  async getSessions(): Promise<Session[]> {
    try {
      return await sessionRepository.getAllSessions();
    } catch (error) {
      console.error("SessionService.getSessions error:", error);
      return [];
    }
  }

  async getSessionById(id: string): Promise<Session | null> {
    try {
      return await sessionRepository.getSessionById(id);
    } catch (error) {
      console.error("SessionService.getSessionById error:", error);
      return null;
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    try {
      if (this.currentSessionId) {
        const session = await sessionRepository.getSessionById(
          this.currentSessionId,
        );
        if (session) return session;
      }

      const session = await sessionRepository.findActiveSession();
      this.currentSessionId = session?.id ?? null;
      return session;
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
      await sessionRepository.updateSession(updated);
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
      await sessionRepository.updateSession(updated);
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
      const session = await sessionRepository.getSessionById(sessionId);
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
      await sessionRepository.updateSessionLock(
        closed.id,
        closed.hash,
        lockedAt,
        data.endTime,
        data.duration,
        data.distance,
      );
      this.currentSessionId = null;
      return closed;
    } catch (error) {
      console.error("SessionService.endSession error:", error);
      return null;
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await sessionRepository.deleteSession(id);
      if (this.currentSessionId === id) this.currentSessionId = null;
    } catch (error) {
      console.error("SessionService.deleteSession error:", error);
      throw error;
    }
  }

  async addEvent(sessionId: string, event: MarkedEvent): Promise<void> {
    try {
      const session = await sessionRepository.getSessionById(sessionId);
      if (!session) {
        console.warn("addEvent: session not found", sessionId);
        return;
      }
      await sessionRepository.insertEvent(sessionId, event);
    } catch (error) {
      console.error("SessionService.addEvent error:", error);
      throw error;
    }
  }

  async refillEvent(sessionId: string, eventId: string): Promise<void> {
    try {
      const session = await sessionRepository.getSessionById(sessionId);
      const event = session?.events.find((item) => item.id === eventId);
      if (!event) return;
      await sessionRepository.updateEvent(sessionId, {
        ...event,
        refilledAt: Date.now(),
      });
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
    photoUri?: string,
  ): Promise<void> {
    try {
      const session = await sessionRepository.getSessionById(sessionId);
      const event = session?.events.find((item) => item.id === eventId);
      if (!event) return;

      const isArtifact = classification.toLowerCase() === "artefact";
      await sessionRepository.updateEvent(sessionId, {
        ...event,
        classification,
        notes,
        photoScale,
        photoUri,
        dracReminderAt: isArtifact
          ? (event.dracReminderAt ?? Date.now() + 24 * 60 * 60 * 1000)
          : undefined,
        dracReminderSeenAt: isArtifact ? event.dracReminderSeenAt : undefined,
      });
    } catch (error) {
      console.error("SessionService.classifyEvent error:", error);
      throw error;
    }
  }

  async addGpsPoint(sessionId: string, point: GpsPoint): Promise<void> {
    try {
      const session = await sessionRepository.getSessionById(sessionId);
      if (!session) {
        console.warn("addGpsPoint: session not found", sessionId);
        return;
      }

      const previous = await sessionRepository.getLastGpsPoint(sessionId);

      await sessionRepository.insertGpsPoint(sessionId, point);

      // Mise à jour distance/duration côté DB (source de vérité sessions.distance)
      // => corrige le bug "distance cumul = 0" même si l’état UI est en race.
      let distanceDelta = 0;
      if (previous) {
        distanceDelta = this.calculateDistance(previous, point);
        if (!Number.isFinite(distanceDelta) || distanceDelta < 0) {
          distanceDelta = 0;
        }
      }

      const newDistance = session.distance + distanceDelta;

      // duration: time between startTime and latest point timestamp
      // (en ms → s dans ton modèle)
      const durationMs = Math.max(0, point.timestamp - session.startTime);
      const durationSeconds = Math.floor(durationMs / 1000);

      await sessionRepository.incrementSessionDistanceAndDuration(
        sessionId,
        distanceDelta,
        durationSeconds,
        newDistance,
      );
    } catch (error) {
      console.error("SessionService.addGpsPoint error:", error);
      throw error;
    }
  }

  async getDueDracReminders(
    now = Date.now(),
  ): Promise<{ session: Session; event: MarkedEvent }[]> {
    const due = await sessionRepository.getDueDracReminders(now);
    const reminders: { session: Session; event: MarkedEvent }[] = [];

    for (const item of due) {
      const session = await sessionRepository.getSessionById(item.sessionId);
      const event = session?.events.find(
        (candidate) => candidate.id === item.eventId,
      );
      if (session && event) {
        reminders.push({ session, event });
      }
    }

    return reminders;
  }

  async markDracReminderSeen(
    sessionId: string,
    eventId: string,
  ): Promise<void> {
    const session = await sessionRepository.getSessionById(sessionId);
    const event = session?.events.find((item) => item.id === eventId);
    if (!event) return;

    await sessionRepository.updateEvent(sessionId, {
      ...event,
      dracReminderSeenAt: Date.now(),
    });
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
      const session = await sessionRepository.getSessionById(sessionId);
      if (!session) return null;

      const classifiedCount = session.events.filter((event) =>
        Boolean(event.classification),
      ).length;

      const avgSpeed =
        session.duration > 0
          ? session.distance / 1000 / (session.duration / 3600)
          : 0;

      return {
        duration: session.duration,
        distance: session.distance,
        eventCount: session.events.length,
        classifiedCount,
        avgSpeed,
      };
    } catch (error) {
      console.error("SessionService.getSessionStats error:", error);
      return null;
    }
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
        photoUri: event.photoUri ?? null,
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
