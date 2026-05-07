import { BleDevice, BleMetrics, bleService } from "@/src/services/bleService";
import { useCallback, useEffect, useState } from "react";

export function useBle() {
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<BleMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = bleService.subscribe((m) => setMetrics(m));
    return () => unsubscribe();
  }, []);

  const connect = useCallback(async (device: BleDevice) => {
    try {
      const success = await bleService.connect(device.name);
      setIsConnected(success);
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur connexion BLE");
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    bleService.disconnect();
    setIsConnected(false);
    setMetrics(null);
  }, []);

  return {
    isConnected,
    metrics,
    error,
    deviceName: bleService.getDeviceName(),
    connect,
    disconnect,
  };
}
