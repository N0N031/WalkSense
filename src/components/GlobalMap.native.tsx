import { MapType, MapTypeToggle } from "@/src/components/MapTypeToggle";
import { COLORS } from "@/src/constants/colors";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RNMapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  UrlTile,
} from "react-native-maps";

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

function colorWithAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return hexColor;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTraceStyle(trace: SessionTrace, index: number) {
  if (trace.active) {
    return { opacity: 0.98, width: 5, zIndex: 18 };
  }

  if (index < 3) {
    return { opacity: 0.78, width: 4, zIndex: 12 };
  }

  return { opacity: 0.44, width: 3, zIndex: 9 };
}

export interface SessionTrace {
  sessionId: string;
  points: GpsPoint[];
  events: MarkedEvent[];
  color: string;
  active: boolean;
}

export interface GlobalMapProps {
  traces: SessionTrace[];
  userLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
  } | null;
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
            maximumZ={zoomLimits.max}
            tileSize={256}
            zIndex={1}
            flipY={false}
          />
        ) : null}

        {traces.map((trace, index) => {
          const polyline = trace.points.map((p) => ({
            latitude: p.lat,
            longitude: p.lon,
          }));
          if (polyline.length < 2) return null;
          const traceStyle = getTraceStyle(trace, index);
          return (
            <React.Fragment key={trace.sessionId}>
              <Polyline
                coordinates={polyline}
                strokeColor="rgba(0, 0, 0, 0.48)"
                strokeWidth={traceStyle.width + 4}
                zIndex={traceStyle.zIndex - 1}
              />
              <Polyline
                coordinates={polyline}
                strokeColor={colorWithAlpha(trace.color, traceStyle.opacity)}
                strokeWidth={traceStyle.width}
                zIndex={traceStyle.zIndex}
              />
              {traces.length <= 12 ? (
                <>
                  <Marker
                    coordinate={polyline[0]}
                    anchor={{ x: 0.5, y: 0.5 }}
                    zIndex={traceStyle.zIndex + 1}
                  >
                    <View
                      style={[
                        styles.traceStartDot,
                        { borderColor: colorWithAlpha(trace.color, 0.82) },
                      ]}
                    />
                  </Marker>
                  <Marker
                    coordinate={polyline[polyline.length - 1]}
                    anchor={{ x: 0.5, y: 0.5 }}
                    zIndex={traceStyle.zIndex + 2}
                  >
                    <View
                      style={[
                        styles.traceEndDot,
                        { backgroundColor: colorWithAlpha(trace.color, 0.92) },
                      ]}
                    />
                  </Marker>
                </>
              ) : null}
            </React.Fragment>
          );
        })}

        {userLocation && (
          <Circle
            center={userLocation}
            radius={Math.max(6, Math.min(userLocation.accuracy ?? 16, 80))}
            strokeColor="rgba(34, 211, 238, 0.42)"
            fillColor="rgba(34, 211, 238, 0.12)"
            zIndex={8}
          />
        )}

        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={20}
          >
            <View style={styles.userMarker}>
              <View style={styles.userPulse} />
              <View style={styles.userDot} />
            </View>
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
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22D3EE",
    borderWidth: 3,
    borderColor: "white",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  userMarker: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  userPulse: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(34, 211, 238, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.55)",
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "white",
  },
  traceStartDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    backgroundColor: "rgba(5, 12, 8, 0.82)",
  },
  traceEndDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.82)",
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
