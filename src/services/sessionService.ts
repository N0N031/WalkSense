/**
 * WalkSense — Session Service
 * Gestion complète des sessions : création, sauvegarde, chargement, export
 * Persistance AsyncStorage + génération UUID
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
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

      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(sessions)
      );
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
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
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
   * Terminer et verrouiller la session
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

      const updated: Session = {
        ...session,
        status: "completed",
        endTime: data.endTime,
        distance: data.distance,
        duration: data.duration,
      };

      await this.saveSession(updated);
      this.currentSessionId = null;
      return updated;
    } catch (error) {
      console.error("SessionService.endSession error:", error);
      return null;
    }
  }

  /**
   * Supprimer une session
   */
  async deleteSession(id: string): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const filtered = sessions.filter((s) => s.id !== id);
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(filtered)
      );
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
   * Mettre à jour la classification d'un événement
   */
  async classifyEvent(
    sessionId: string,
    eventId: string,
    classification: string,
    notes?: string
  ): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) return;

      session.events = session.events.map((e) =>
        e.id === eventId ? { ...e, classification, notes } : e
      );

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
