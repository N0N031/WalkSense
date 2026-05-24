/**
 * BLE Service
 * Gère la communication Bluetooth Low Energy avec détecteur de métaux
 * V1.0 : Mock data | V2.0 : Vraie API BLE
 */

export interface BleDevice {
  name: string;
  id: string;
  rssi: number; // Signal strength (-90 to 0 dBm)
  connected: boolean;
}

export interface BleMetrics {
  rssi: number; // -90 to 0 dBm
  battery: number; // 0-100%
  frequency: number; // Hz (détecteur)
}

class BleService {
  private device: BleDevice | null = null;
  private metrics: BleMetrics = { rssi: -65, battery: 85, frequency: 18000 };
  private isConnected: boolean = false;
  private listeners: Set<(metrics: BleMetrics) => void> = new Set();

  async initialize(): Promise<void> {
    // TODO: Implémenter vraie API BLE (react-native-ble-plx)
    console.log("✅ BLE Service initialized (mock mode)");
  }

  connect(deviceName: string = "XP Deus II"): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.device = {
          name: deviceName,
          id: `ble-${Date.now()}`,
          rssi: -45,
          connected: true,
        };
        this.isConnected = true;
        this.startMetricsSimulation();
        console.log(`✅ Connected to ${deviceName}`);
        resolve(true);
      }, 500);
    });
  }

  disconnect(): void {
    if (this.device) {
      this.device.connected = false;
      this.isConnected = false;
      this.device = null;
      console.log("✅ Disconnected from BLE device");
    }
  }

  private startMetricsSimulation(): void {
    const interval = setInterval(() => {
      if (!this.isConnected) {
        clearInterval(interval);
        return;
      }

      // Simulate signal fluctuation
      this.metrics.rssi = Math.max(
        -90,
        Math.min(0, this.metrics.rssi + (Math.random() - 0.5) * 10),
      );

      // Simulate battery drain (very slow)
      this.metrics.battery = Math.max(0, this.metrics.battery - 0.001);

      // Simulate frequency changes
      this.metrics.frequency = 18000 + Math.sin(Date.now() / 5000) * 500;

      this.notifyListeners();
    }, 500);
  }

  getMetrics(): BleMetrics {
    return { ...this.metrics };
  }

  subscribe(callback: (metrics: BleMetrics) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.getMetrics()));
  }

  isDeviceConnected(): boolean {
    return this.isConnected;
  }

  getDeviceName(): string {
    return this.device?.name || "Not connected";
  }
}

export const bleService = new BleService();
