import { MapType, MapTypeToggle } from "@/src/components/MapTypeToggle";
import { COLORS } from "@/src/constants/colors";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RNMapView, { Marker, Polyline, UrlTile } from "react-native-maps";

const TILES = {
  osm: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  ign: "https://wxs.ign.fr/geoportail/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}",
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
  controlsTopOffset?: number;
  controlsBottomOffset?: number;
}

export default function GlobalMap({
  traces,
  userLocation,
  controlsTopOffset = 10,
  controlsBottomOffset = 16,
}: GlobalMapProps) {
  const [mapType, setMapType] = useState<MapType>("satellite");
  const mapRef = useRef<RNMapView>(null);
  const centeredOnFirstLocationRef = useRef(false);

  const tileUrlTemplate =
    mapType === "ign" ? TILES.ign : mapType === "osm" ? TILES.osm : undefined;

  const nativeMapType =
    mapType === "satellite"
      ? "satellite"
      : mapType === "google"
        ? "standard"
        : "none";

  const allPoints = traces.flatMap((t) => t.points);

  const initialRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : allPoints.length > 0
      ? {
          latitude: allPoints[0].lat,
          longitude: allPoints[0].lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : {
          latitude: 43.6047,
          longitude: 1.4442,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

  function fitAll() {
    const coords = allPoints.map((p) => ({
      latitude: p.lat,
      longitude: p.lon,
    }));
    if (userLocation) coords.push(userLocation);
    if (coords.length === 0) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: true,
    });
  }

  const centerOnUser = useCallback(() => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      { ...userLocation, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      400,
    );
  }, [userLocation]);

  useEffect(() => {
    if (!userLocation || centeredOnFirstLocationRef.current) return;
    centeredOnFirstLocationRef.current = true;
    centerOnUser();
  }, [centerOnUser, userLocation]);

  return (
    <View style={styles.container}>
      <RNMapView
        ref={mapRef}
        style={{ flex: 1 }}
        mapType={nativeMapType as any}
        initialRegion={initialRegion}
        maxZoomLevel={19}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onMapReady={() => {
          if (userLocation) centerOnUser();
          else fitAll();
        }}
      >
        {tileUrlTemplate ? (
          <UrlTile
            urlTemplate={tileUrlTemplate}
            maximumZ={19}
            tileSize={256}
            flipY={false}
          />
        ) : null}

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
              <Marker
                key={event.id}
                coordinate={coord}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[styles.eventDot, { backgroundColor: bg }]} />
              </Marker>
            );
          }),
        )}
      </RNMapView>
      <View pointerEvents="none" style={styles.mapTint} />

      <TouchableOpacity
        style={[styles.fitButton, { bottom: controlsBottomOffset }]}
        onPress={fitAll}
      >
        <Ionicons name="expand-outline" size={20} color={COLORS.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.locateButton,
          { bottom: controlsBottomOffset + 52 },
          !userLocation && styles.buttonDisabled,
        ]}
        onPress={centerOnUser}
      >
        <Ionicons
          name="locate"
          size={20}
          color={userLocation ? COLORS.primary : COLORS.textTertiary}
        />
      </TouchableOpacity>

      <View style={[styles.layerToggle, { top: controlsTopOffset }]}>
        <MapTypeToggle currentType={mapType} onChange={setMapType} />
      </View>

      <Text
        style={[
          styles.attribution,
          mapType === "satellite" && styles.attributionSat,
        ]}
      >
        {mapType === "satellite"
          ? "© Esri, Maxar"
          : mapType === "ign"
            ? "© IGN Geoportail"
            : "© OpenStreetMap contributors"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  mapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 32, 12, 0.22)",
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.info,
    borderWidth: 2,
    borderColor: "white",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 12,
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
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.glassStrong,
    borderWidth: 1,
    borderColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  locateButton: {
    position: "absolute",
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.glassStrong,
    borderWidth: 1,
    borderColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  layerToggle: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.glassStrong,
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
