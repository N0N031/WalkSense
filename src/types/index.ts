/**
 * Types WalkSense
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SESSION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type SessionStatus = "running" | "paused" | "stopped";
export type PrivacyMode = "private" | "blurred" | "group" | "ghost";
export type MarkerType = "auto" | "manual" | "find";
export type MapStyle = "osm" | "satellite" | "terrain" | "dark";

export interface GpsPoint {
  id: string;
  lat: number;
  lon: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface Marker {
  id: string;
  type: MarkerType;
  lat: number;
  lon: number;
  timestamp: number;
  signal?: number; // 0-100 pour auto
  note?: string; // pour manual/find
  classification?: string; // pour find (archéo type)
  depth?: number; // pour find (cm)
  photo?: string; // base64 ou URI
}

export interface Session {
  id: string;
  name: string;
  description?: string;
  startTime: number;
  endTime?: number;
  status: SessionStatus;
  gpsPoints: GpsPoint[];
  markers: Marker[];
  totalDistance: number;
  totalDuration: number;
  privacyMode: PrivacyMode;
  mapStyle: MapStyle;
  detectorConnected: boolean;
  detectorName?: string;
  notes?: string;
  tags?: string[];
  createdBy?: string;
  location?: {
    region: string;
    terrain: string;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DÉTECTEUR BLE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BleDevice {
  id: string;
  name: string;
  rssi: number;
  connected: boolean;
  battery?: number;
  lastSeen?: number;
}

export interface DetectorSignal {
  signal: number; // 0-100
  frequency?: number;
  timestamp: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  icon?: string;
  text: string;
  duration?: number;
}

export interface BottomSheetState {
  visible: boolean;
  tab?: "events" | "info";
  height?: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FILTERS & EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SessionFilter {
  dateFrom?: number;
  dateTo?: number;
  markerType?: MarkerType;
  privacyMode?: PrivacyMode;
  tags?: string[];
  minDistance?: number;
}

export interface ExportOptions {
  format: "pdf" | "csv" | "gpx" | "json";
  includePhotos?: boolean;
  includeMarkers?: boolean;
  compressionLevel?: "low" | "medium" | "high";
}

export interface ExportedSession extends Session {
  exportDate: number;
  exportFormat: string;
  hash?: string; // SHA-256 pour intégrité
}
