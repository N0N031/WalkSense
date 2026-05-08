import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RNMapView, { Marker, Polyline, UrlTile } from "react-native-maps";

const TILES = {
  street: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

export interface SessionTrace {
  sessionId: string;
  points: GpsPoint[];
  events: MarkedEvent[];
  color: string;
  active: boolean;
}

export interface GlobalMapProps {
  traces: SessionTrace[];
  userLocation: { latitude: number; longitude: number } | null;
}

export default function GlobalMap({ traces, userLocation }: GlobalMapProps) {
  const [satellite, setSatellite] = useState(false);
  const mapRef = useRef<RNMapView>(null);

  const allPoints = traces.flatMap((t) => t.points);

  const initialRegion =
    allPoints.length > 0
      ? {
          latitude: allPoints[0].lat,
          longitude: allPoints[0].lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : {
          latitude: userLocation?.latitude ?? 43.6047,
          longitude: userLocation?.longitude ?? 1.4442,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

  function fitAll() {
    const coords = allPoints.map((p) => ({ latitude: p.lat, longitude: p.lon }));
    if (userLocation) coords.push(userLocation);
    if (coords.length === 0) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: true,
    });
  }

  return (
    <View style={styles.container}>
      <RNMapView
        ref={mapRef}
        style={{ flex: 1 }}
        mapType="none"
        initialRegion={initialRegion}
        maxZoomLevel={19}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onMapReady={fitAll}
      >
        <UrlTile
          urlTemplate={satellite ? TILES.satellite : TILES.street}
          maximumZ={19}
          tileSize={256}
        />

        {traces.map((trace) => {
          const polyline = trace.points.map((p) => ({
            latitude: p.lat,
            longitude: p.lon,
          }));
          if (polyline.length < 2) return null;
          return (
            <Polyline
              key={trace.sessionId}
              coordinates={polyline}
              strokeColor={trace.color}
              strokeWidth={trace.active ? 3 : 2}
            />
          );
        })}

        {userLocation && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userDot} />
          </Marker>
        )}

        {traces.flatMap((trace) =>
          trace.events.map((event) => {
            const coord = {
              latitude: event.position?.latitude ?? event.location.lat,
              longitude: event.position?.longitude ?? event.location.lon,
            };
            const bg =
              event.type === "auto"
                ? COLORS.markerAuto
                : event.type === "find"
                  ? COLORS.markerFind
                  : COLORS.markerManual;
            return (
              <Marker key={event.id} coordinate={coord} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={[styles.eventDot, { backgroundColor: bg }]} />
              </Marker>
            );
          }),
        )}
      </RNMapView>

      <TouchableOpacity style={styles.fitButton} onPress={fitAll}>
        <Ionicons name="expand-outline" size={20} color={COLORS.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.layerToggle, satellite && styles.layerToggleActive]}
        onPress={() => setSatellite((s) => !s)}
      >
        <Text style={[styles.layerText, satellite && styles.layerTextActive]}>
          {satellite ? "🛰 Satellite" : "🗺 Carte"}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.attribution, satellite && styles.attributionSat]}>
        {satellite ? "© Esri, Maxar" : "© OpenStreetMap contributors"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.info,
    borderWidth: 2,
    borderColor: "white",
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "white",
  },
  fitButton: {
    position: "absolute",
    bottom: 16,
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  layerToggle: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
  },
  layerToggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  layerText: { fontSize: 12, fontWeight: "600", color: COLORS.text },
  layerTextActive: { color: "white" },
  attribution: {
    position: "absolute",
    bottom: 4,
    right: 8,
    fontSize: 9,
    color: COLORS.textTertiary,
  },
  attributionSat: { color: "rgba(255,255,255,0.7)" },
});
