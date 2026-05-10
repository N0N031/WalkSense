import { MapType, MapTypeToggle } from "@/src/components/MapTypeToggle";
import { COLORS } from "@/src/constants/colors";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RNMapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from "react-native-maps";

const IGN = (layer: string, fmt = "image/png", tms = "PM") =>
  `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&FORMAT=${fmt}&TILEMATRIXSET=${tms}&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}`;

const TILES: Record<string, string> = {
  osm: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  ign: IGN("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2"),
  "ign-ortho": IGN("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg"),
  "ign-cassini": IGN("BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI", "image/png", "PM_6_14"),
  "ign-etatmajor": IGN("GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40", "image/jpeg", "PM_6_15"),
  "ign-cadastre": IGN("CADASTRALPARCELS.PARCELLAIRE_EXPRESS", "image/png", "PM_0_19"),
};

const ZOOM_LIMITS: Record<string, { min: number; max: number }> = {
  google:        { min: 0,  max: 20 },
  satellite:     { min: 0,  max: 20 },
  osm:           { min: 0,  max: 19 },
  ign:           { min: 0,  max: 19 },
  "ign-ortho":   { min: 0,  max: 21 },
  "ign-cassini": { min: 6,  max: 14 },
  "ign-etatmajor": { min: 6, max: 15 },
  "ign-cadastre":  { min: 0, max: 19 },
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
}

export default function GlobalMap({
  traces,
  userLocation,
  controlsTopOffset = 10,
}: GlobalMapProps) {
  const [mapType, setMapType] = useState<MapType>("google");
  const mapRef = useRef<RNMapView>(null);
  const centeredOnFirstLocationRef = useRef(false);

  const tileUrlTemplate = TILES[mapType] ?? undefined;
  const zoomLimits = ZOOM_LIMITS[mapType] ?? { min: 0, max: 19 };

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
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        mapType={nativeMapType as any}
        initialRegion={initialRegion}
        minZoomLevel={zoomLimits.min}
        maxZoomLevel={zoomLimits.max}
        showsUserLocation={true}
        showsMyLocationButton={false}
        loadingEnabled
        loadingBackgroundColor="#050805"
        loadingIndicatorColor="#D4AF37"
        onMapReady={() => {
          if (userLocation) centerOnUser();
          else fitAll();
        }}
      >
        {tileUrlTemplate ? (
          <UrlTile
            urlTemplate={tileUrlTemplate}
            maximumZ={zoomLimits.max}
            tileSize={256}
            zIndex={1}
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

      <View style={[styles.mapControls, { top: controlsTopOffset }]}>
        <MapTypeToggle currentType={mapType} onChange={setMapType} />
        <TouchableOpacity
          style={[styles.mapControlButton, !userLocation && styles.buttonDisabled]}
          onPress={centerOnUser}
          disabled={!userLocation}
        >
          <Ionicons
            name="locate"
            size={21}
            color={userLocation ? COLORS.primary : COLORS.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapControlButton} onPress={fitAll}>
          <Ionicons name="expand-outline" size={21} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <Text
        style={[
          styles.attribution,
          mapType === "satellite" && styles.attributionSat,
        ]}
      >
        {mapType === "satellite"
          ? "© Esri, Maxar"
          : mapType === "osm"
            ? "© OpenStreetMap contributors"
            : mapType === "ign-ortho"
              ? "© IGN Orthophotos"
              : mapType === "ign-cassini"
                ? "© IGN Cassini XVIIIe"
                : mapType === "ign-etatmajor"
                  ? "© IGN État-Major XIXe"
                  : mapType === "ign-cadastre"
                    ? "© IGN Cadastre"
                    : mapType.startsWith("ign")
                      ? "© IGN Géoportail"
                      : "© Google"}
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
  mapControls: {
    position: "absolute",
    right: 16,
    zIndex: 45,
    elevation: 14,
    alignItems: "center",
    gap: 10,
  },
  mapControlButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(5, 12, 8, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.34)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  attribution: {
    position: "absolute",
    bottom: 4,
    right: 8,
    fontSize: 9,
    color: COLORS.textTertiary,
  },
  attributionSat: { color: "rgba(255,255,255,0.7)" },
});
