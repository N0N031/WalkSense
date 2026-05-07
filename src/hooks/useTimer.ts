import { useCallback, useEffect, useRef, useState } from "react";

export interface TimerState {
  elapsed: number;
  isRunning: boolean;
}

export function useTimer(initialSeconds = 0) {
  const [elapsed, setElapsed] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Démarrer le chrono
   */
  const start = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [isRunning]);

  /**
   * Arrêter le chrono
   */
  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  /**
   * Réinitialiser le chrono
   */
  const reset = useCallback(() => {
    stop();
    setElapsed(initialSeconds);
  }, [stop, initialSeconds]);

  /**
   * Pause et reprendre
   */
  const pause = useCallback(() => {
    stop();
  }, [stop]);

  const resume = useCallback(() => {
    start();
  }, [start]);

  /**
   * Formater le temps écoulé
   */
  const format = useCallback((seconds: number = elapsed): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}h${String(m).padStart(2, "0")}m`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsed]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    elapsed,
    isRunning,
    start,
    stop,
    reset,
    pause,
    resume,
    format,
  };
}