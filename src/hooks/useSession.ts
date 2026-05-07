import { MarkedEvent, Session, sessionService } from "@/src/services/sessionService";
import { useCallback, useState } from "react";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const newSession = await sessionService.createSession();
      setSession(newSession);
      return newSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur création session");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
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

  const addEvent = useCallback(
    async (event: MarkedEvent) => {
      if (!session) return;
      try {
        await sessionService.addEvent(session.id, event);
        setSession((prev) =>
          prev ? { ...prev, events: [...prev.events, event] } : null
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur ajout événement");
      }
    },
    [session],
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
    isLoading,
    error,
    createSession,
    loadSession,
    addEvent,
    saveSession,
  };
}
