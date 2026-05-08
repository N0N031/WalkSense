/**
 * WalkSense — Session Service
 * Gestion complète des sessions : création, sauvegarde, chargement, export
 * Persistance AsyncStorage + génération UUID
 */

import { sha256 } from "@/src/utils/sha256";
import { vaultService } from "@/src/services/vaultService";
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

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
  /**
   * Types unifiés :
   * - "metal" | "noise" | "anomaly" | "other" : types service (stockage)
   * - "auto" | "manual" | "find" : alias UI (explore.tsx)
   */
  type:
    | "metal"
    | "noise"
    | "anomaly"
    | "other"
    | "auto"
    | "manual"
    | "find";
  /** Classification libre (string) — pas de union restrictive */
  classification?: string;
  /** Force du signal — alias principal */
  signalStrength?: number;
  /** Alias signal pour explore.tsx */
  signal?: number;
  notes?: string;
  /** Timestamp de confirmation de rebouchage (ms). */
  refilledAt?: number;
  /** Rappel de declaration DRAC a 24h pour les artefacts. */
  dracReminderAt?: number;
  /** Dernier affichage du rappel DRAC. */
  dracReminderSeenAt?: number;
  /** Indication d'echelle visible sur la photo terrain. */
  photoScale?: "none" | "coin" | "rule" | "hand";
  /** Position (alias location) pour explore.tsx */
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
  /** "running" ajouté comme alias de "active" pour compatibilité */
  status: "active" | "paused" | "running" | "completed";
  gpsTrace: GpsPoint[];
  events: MarkedEvent[];
  metadata: {
    bleDetector?: string;
    temperatureAvg?: number;
    humidityAvg?: number;
    privateMode: boolean;
  };
  /** SHA-256 du contenu canonique — calculé à la clôture, immutable. */
  hash?: string;
  /** Timestamp de verrouillage (ms). */
  lockedAt?: number;
}

// ═══════════════════════════════════════════════════════════════════
// SESSION SERVICE
// ═══════════════════════════════════════════════════════════════════

class SessionService {
  private readonly STORAGE_KEY = "walksense_sessions";
  private currentSessionId: string | null = null;

  // ─────────────────────────────────────────────────────────────────
  // CRUD SESSIONS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Créer une nouvelle session
   */
  async createSession(): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: generateUUID(),
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

    await this.saveSession(session);
    this.currentSessionId = session.id;
    return session;
  }

  /**
   * Sauvegarder une session (insert ou update)
   */
  async saveSession(session: Session): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const existingIndex = sessions.findIndex((s) => s.id === session.id);

      if (existingIndex !== -1) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      await vaultService.setJson(this.STORAGE_KEY, sessions);
    } catch (error) {
      console.error("SessionService.saveSession error:", error);
      throw error;
    }
  }

  /**
   * Charger toutes les sessions
   */
  async getSessions(): Promise<Session[]> {
    try {
      return await vaultService.getJson<Session[]>(this.STORAGE_KEY, []);
    } catch (error) {
      console.error("SessionService.getSessions error:", error);
      return [];
    }
  }

  /**
   * Charger une session par ID
   */
  async getSessionById(id: string): Promise<Session | null> {
    try {
      const sessions = await this.getSessions();
      return sessions.find((s) => s.id === id) || null;
    } catch (error) {
      console.error("SessionService.getSessionById error:", error);
      return null;
    }
  }

  /**
   * Récupérer la session en cours (active ou paused)
   * Appelé par explore.tsx au chargement
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      // Si on a un ID en mémoire, on l'utilise
      if (this.currentSessionId) {
        const session = await this.getSessionById(this.currentSessionId);
        if (session) return session;
      }

      // Sinon, on cherche dans le storage
      const sessions = await this.getSessions();
      const active = sessions.find(
        (s) =>
          s.status === "active" ||
          s.status === "paused" ||
          s.status === "running"
      );

      if (active) {
        this.currentSessionId = active.id;
        return active;
      }

      return null;
    } catch (error) {
      console.error("SessionService.getCurrentSession error:", error);
      return null;
    }
  }

  /**
   * Mettre la session en pause
   */
  async pauseSession(): Promise<Session | null> {
    try {
      if (!this.currentSessionId) return null;

      const session = await this.getSessionById(this.currentSessionId);
      if (!session) return null;

      const updated: Session = {
        ...session,
        status: "paused",
      };

      await this.saveSession(updated);
      return updated;
    } catch (error) {
      console.error("SessionService.pauseSession error:", error);
      return null;
    }
  }

  /**
   * Reprendre la session après pause
   */
  async resumeSession(): Promise<Session | null> {
    try {
      if (!this.currentSessionId) return null;

      const session = await this.getSessionById(this.currentSessionId);
      if (!session) return null;

      const updated: Session = {
        ...session,
        status: "active",
      };

      await this.saveSession(updated);
      return updated;
    } catch (error) {
      console.error("SessionService.resumeSession error:", error);
      return null;
    }
  }

  /**
   * Terminer et verrouiller la session avec hash SHA-256.
   * Une fois clôturée, la session est immutable.
   */
  async endSession(
    sessionId: string,
    data: {
      endTime: number;
      distance: number;
      duration: number;
    }
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

      closed.hash = sha256(this.buildCanonical(closed));

      await this.saveSession(closed);
      this.currentSessionId = null;
      return closed;
    } catch (error) {
      console.error("SessionService.endSession error:", error);
      return null;
    }
  }

  /**
   * Construit la représentation canonique déterministe d'une session.
   * C'est cette chaîne qui est hachée — toute modification ultérieure
   * invalidera le hash.
   */
  private buildCanonical(session: Session): string {
    return JSON.stringify({
      v: "1.0",
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      distance: Math.round(session.distance * 1000) / 1000,
      lockedAt: session.lockedAt,
      events: session.events.map((e) => ({
        id: e.id,
        ts: e.timestamp,
        type: e.type,
        lat: e.location.lat,
        lon: e.location.lon,
        classification: e.classification ?? null,
        refilledAt: e.refilledAt ?? null,
        photoScale: e.photoScale ?? null,
        dracReminderAt: e.dracReminderAt ?? null,
      })),
      gpsPoints: session.gpsTrace.length,
    });
  }

  /**
   * Supprimer une session
   */
  async deleteSession(id: string): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const filtered = sessions.filter((s) => s.id !== id);
      await vaultService.setJson(this.STORAGE_KEY, filtered);
      if (this.currentSessionId === id) {
        this.currentSessionId = null;
      }
    } catch (error) {
      console.error("SessionService.deleteSession error:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // ÉVÉNEMENTS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Ajouter un événement à une session
   */
  async addEvent(sessionId: string, event: MarkedEvent): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) {
        console.warn("addEvent: session not found", sessionId);
        return;
      }

      session.events.push(event);
      await this.saveSession(session);
    } catch (error) {
      console.error("SessionService.addEvent error:", error);
      throw error;
    }
  }

  /**
   * Confirmer le rebouchage d'un événement (obligation légale)
   */
  async refillEvent(sessionId: string, eventId: string): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) return;

      session.events = session.events.map((e) =>
        e.id === eventId ? { ...e, refilledAt: Date.now() } : e
      );

      await this.saveSession(session);
    } catch (error) {
      console.error("SessionService.refillEvent error:", error);
      throw error;
    }
  }

  /**
   * Mettre à jour la classification d'un événement
   */
  async classifyEvent(
    sessionId: string,
    eventId: string,
    classification: string,
    notes?: string,
    photoScale?: MarkedEvent["photoScale"],
  ): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) return;

      session.events = session.events.map((e) => {
        if (e.id !== eventId) return e;
        const isArtifact = classification.toLowerCase() === "artefact";
        return {
          ...e,
          classification,
          notes,
          photoScale,
          dracReminderAt: isArtifact
            ? e.dracReminderAt ?? Date.now() + 24 * 60 * 60 * 1000
            : undefined,
          dracReminderSeenAt: isArtifact ? e.dracReminderSeenAt : undefined,
        };
      });

      await this.saveSession(session);
    } catch (error) {
      console.error("SessionService.classifyEvent error:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // GPS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Ajouter un point GPS à une session
   */
  async addGpsPoint(sessionId: string, point: GpsPoint): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) return;

      session.gpsTrace.push(point);
      await this.saveSession(session);
    } catch (error) {
      console.error("SessionService.addGpsPoint error:", error);
      throw error;
    }
  }

  async getDueDracReminders(now = Date.now()): Promise<
    { session: Session; event: MarkedEvent }[]
  > {
    const sessions = await this.getSessions();
    return sessions.flatMap((session) =>
      session.events
        .filter(
          (event) =>
            event.dracReminderAt &&
            event.dracReminderAt <= now &&
            !event.dracReminderSeenAt,
        )
        .map((event) => ({ session, event })),
    );
  }

  async markDracReminderSeen(sessionId: string, eventId: string): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) return;

    session.events = session.events.map((event) =>
      event.id === eventId ? { ...event, dracReminderSeenAt: Date.now() } : event,
    );
    await this.saveSession(session);
  }

  /**
   * Calculer la distance entre deux points GPS (formule Haversine)
   */
  calculateDistance(p1: GpsPoint, p2: GpsPoint): number {
    const R = 6371000; // Rayon Terre en mètres
    const dLat = this.toRad(p2.lat - p1.lat);
    const dLon = this.toRad(p2.lon - p1.lon);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(p1.lat)) *
        Math.cos(this.toRad(p2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance en mètres
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  // ─────────────────────────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────────────────────────

  /**
   * Exporter session en JSON
   */
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

  /**
   * Exporter session en GPX (pour cartes GPS)
   */
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

      // Ajouter les waypoints (événements)
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

  // ─────────────────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Obtenir les statistiques d'une session
   */
  async getSessionStats(sessionId: string): Promise<{
    duration: number;
    distance: number;
    eventCount: number;
    classifiedCount: number;
    avgSpeed: number;
  } | null> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) return null;

      const classifiedCount = session.events.filter(
        (e) => e.classification
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
}

export const sessionService = new SessionService();
