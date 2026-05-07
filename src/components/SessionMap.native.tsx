import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/src/constants/colors";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RNMapView, { Marker, Polyline, UrlTile } from "react-native-maps";

const TILES = {
  street: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

export interface SessionMapProps {
  gpsTrace: GpsPoint[];
  userLocation: { latitude: number; longitude: number } | null;
  events: MarkedEvent[];
  onEventPress: (event: MarkedEvent) => void;
}

export default function SessionMap({
  gpsTrace,
  userLocation,
  events,
  onEventPress,
}: SessionMapProps) {
  const [satellite, setSatellite] = useState(false);
  const mapRef = useRef<RNMapView>(null);

  const region = {
    latitude: userLocation?.latitude ?? 43.6047,
    longitude: userLocation?.longitude ?? 1.4442,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  const polyline = useMemo(
    () => gpsTrace.map((p) => ({ latitude: p.lat, longitude: p.lon })),
    [gpsTrace]
  );

  return (
    <View style={styles.container}>
      <RNMapView
        ref={mapRef}
        style={{ flex: 1 }}
        mapType="none"
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        moveOnMarkerPress={false}
      >
        <UrlTile
          urlTemplate={satellite ? TILES.satellite : TILES.street}
          maximumZ={19}
          tileSize={256}
        />

        {polyline.length > 1 && (
          <Polyline
            coordinates={polyline}
            strokeColor={satellite ? "#00ccff" : COLORS.gpsTrace}
            strokeWidth={3}
          />
        )}

        {userLocation && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userDot} />
          </Marker>
        )}

        {events.map((event, idx) => {
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
            <Marker
              key={event.id}
              coordinate={coord}
              onPress={() => onEventPress(event)}
            >
              <View style={[styles.marker, { backgroundColor: bg }]}>
                <Text style={styles.markerText}>{idx + 1}</Text>
              </View>
            </Marker>
          );
        })}
      </RNMapView>

      {/* Centrage sur position */}
      <TouchableOpacity
        style={[styles.centerButton, !userLocation && styles.centerButtonDisabled]}
        onPress={() => {
          if (!userLocation) return;
          mapRef.current?.animateToRegion(
            { ...userLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 },
            400
          );
        }}
      >
        <Ionicons
          name="locate"
          size={20}
          color={userLocation ? COLORS.primary : COLORS.textTertiary}
        />
      </TouchableOpacity>

      {/* Toggle satellite / street */}
      <TouchableOpacity
        style={[styles.layerToggle, satellite && styles.layerToggleActive]}
        onPress={() => setSatellite((s) => !s)}
      >
        <Text style={[styles.layerToggleText, satellite && styles.layerToggleTextActive]}>
          {satellite ? "🛰 Satellite" : "🗺 Carte"}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.attribution, satellite && styles.attributionSat]}>
        {satellite ? "© Esri, Maxar, Earthstar Geographics" : "© OpenStreetMap contributors"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 3,
    overflow: "hidden",
  },
  userDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.info,
    borderWidth: 2,
    borderColor: "white",
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  markerText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  centerButton: {
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  centerButtonDisabled: {
    opacity: 0.4,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  layerToggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  layerToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  layerToggleTextActive: {
    color: "white",
  },
  attribution: {
    position: "absolute",
    bottom: 4,
    right: 8,
    fontSize: 9,
    color: COLORS.textTertiary,
  },
  attributionSat: {
    color: "rgba(255,255,255,0.7)",
  },
});
