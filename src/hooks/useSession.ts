import {
  GpsPoint,
  MarkedEvent,
  Session,
  sessionService,
} from "@/src/services/sessionService";
import { getCommune } from "@/src/services/geocodingService";
import * as Location from "expo-location";
import { useCallback, useMemo, useState } from "react";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRunning = useMemo(
    () => session?.status === "active" || session?.status === "running",
    [session?.status],
  );

  const hydrateSessionCommune = useCallback(async (sessionId: string) => {
    try {
      const lastLocation = await Location.getLastKnownPositionAsync();
      if (!lastLocation) return;

      const commune = await getCommune(
        lastLocation.coords.latitude,
        lastLocation.coords.longitude,
      );
      await sessionService.updateSessionCommune(sessionId, commune);
      setSession((prev) =>
        prev?.id === sessionId ? { ...prev, commune } : prev,
      );
    } catch (err) {
      console.warn("Session commune geocoding skipped:", err);
    }
  }, []);

  const createSession = useCallback(async (input?: {
    name?: string;
    commune?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      const newSession = await sessionService.createSession(input);
      setSession(newSession);
      void hydrateSessionCommune(newSession.id);
      return newSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur creation session");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [hydrateSessionCommune]);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const loaded = await sessionService.getSessionById(sessionId);
      setSession(loaded);
      return loaded;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCurrentSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const current = await sessionService.getCurrentSession();
      setSession(current);
      return current;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEvent = useCallback(
    async (event: MarkedEvent) => {
      if (!session) return false;
      try {
        await sessionService.addEvent(session.id, event);
        setSession((prev) =>
          prev ? { ...prev, events: [event, ...prev.events] } : null,
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur ajout evenement");
        return false;
      }
    },
    [session],
  );

  const addGpsPoint = useCallback(
    async (point: GpsPoint) => {
      if (!session) return false;
      try {
        await sessionService.addGpsPoint(session.id, point);
        setSession((prev) =>
          prev ? { ...prev, gpsTrace: [...prev.gpsTrace, point] } : null,
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur trace GPS");
        return false;
      }
    },
    [session],
  );

  const pause = useCallback(async () => {
    const updated = await sessionService.pauseSession();
    if (updated) setSession(updated);
    return updated;
  }, []);

  const resume = useCallback(async () => {
    const updated = await sessionService.resumeSession();
    if (updated) setSession(updated);
    return updated;
  }, []);

  const end = useCallback(
    async (distance: number, duration: number) => {
      if (!session) return null;
      const updated = await sessionService.endSession(session.id, {
        endTime: Date.now(),
        distance,
        duration,
      });
      setSession(null);
      return updated;
    },
    [session],
  );

  const classify = useCallback(
    async (
      eventId: string,
      classification: string,
      notes?: string,
      photoScale?: MarkedEvent["photoScale"],
    ) => {
      if (!session) return false;
      try {
        await sessionService.classifyEvent(
          session.id,
          eventId,
          classification,
          notes,
          photoScale,
        );
        setSession((prev) =>
          prev
            ? {
                ...prev,
                events: prev.events.map((event) =>
                  event.id === eventId
                    ? {
                        ...event,
                        classification,
                        notes,
                        photoScale,
                        dracReminderAt:
                          classification.toLowerCase() === "artefact"
                            ? event.dracReminderAt ??
                              Date.now() + 24 * 60 * 60 * 1000
                            : undefined,
                      }
                    : event,
                ),
              }
            : null,
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur classification");
        return false;
      }
    },
    [session],
  );

  const refill = useCallback(
    async (eventId: string) => {
      if (!session) return false;
      try {
        await sessionService.refillEvent(session.id, eventId);
        const refilledAt = Date.now();
        setSession((prev) =>
          prev
            ? {
                ...prev,
                events: prev.events.map((e) =>
                  e.id === eventId ? { ...e, refilledAt } : e
                ),
              }
            : null
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur rebouchage");
        return false;
      }
    },
    [session]
  );

  const saveSession = useCallback(async () => {
    if (!session) return false;
    try {
      await sessionService.saveSession(session);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur sauvegarde");
      return false;
    }
  }, [session]);

  return {
    session,
    setSession,
    isRunning,
    isLoading,
    error,
    createSession,
    loadSession,
    loadCurrentSession,
    addEvent,
    addGpsPoint,
    pause,
    resume,
    end,
    classify,
    refill,
    saveSession,
  };
}
