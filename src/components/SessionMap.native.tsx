import { MapType, MapTypeToggle } from "@/src/components/MapTypeToggle";
import { COLORS } from "@/src/constants/colors";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import { Ionicons } from "@expo/vector-icons";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RNMapView, { Marker, Polyline, UrlTile } from "react-native-maps";

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
  google:          { min: 0,  max: 20 },
  satellite:       { min: 0,  max: 20 },
  osm:             { min: 0,  max: 19 },
  ign:             { min: 0,  max: 19 },
  "ign-ortho":     { min: 0,  max: 21 },
  "ign-cassini":   { min: 6,  max: 14 },
  "ign-etatmajor": { min: 6,  max: 15 },
  "ign-cadastre":  { min: 0,  max: 19 },
};

export interface SessionMapProps {
  gpsTrace: GpsPoint[];
  userLocation: { latitude: number; longitude: number } | null;
  events: MarkedEvent[];
  onEventPress: (event: MarkedEvent) => void;
  historicalTraces?: GpsPoint[][];
}

export default function SessionMap({
  gpsTrace,
  userLocation,
  events,
  onEventPress,
  historicalTraces = [],
}: SessionMapProps) {
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

  const region = {
    latitude: userLocation?.latitude ?? 43.6047,
    longitude: userLocation?.longitude ?? 1.4442,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  const polyline = useMemo(
    () => gpsTrace.map((p) => ({ latitude: p.lat, longitude: p.lon })),
    [gpsTrace],
  );

  const centerOnUser = useCallback(() => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      { ...userLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 },
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
        initialRegion={region}
        minZoomLevel={zoomLimits.min}
        maxZoomLevel={zoomLimits.max}
        showsUserLocation={false}
        showsMyLocationButton={false}
        moveOnMarkerPress={false}
        loadingEnabled
        loadingBackgroundColor="#050505"
        loadingIndicatorColor="#d4af37"
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

        {historicalTraces.map((trace, idx) => {
          const coords = trace.map((p) => ({
            latitude: p.lat,
            longitude: p.lon,
          }));
          return coords.length > 1 ? (
            <Polyline
              key={`hist-${idx}`}
              coordinates={coords}
              strokeColor="rgba(212, 175, 55, 0.25)"
              strokeWidth={2}
            />
          ) : null;
        })}

        {polyline.length > 1 && (
          <Polyline
            coordinates={polyline}
            strokeColor={mapType === "satellite" ? "#00ccff" : COLORS.gpsTrace}
            strokeWidth={3}
            zIndex={10}
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
      <View pointerEvents="none" style={styles.mapTint} />

      <TouchableOpacity
        style={[
          styles.centerButton,
          !userLocation && styles.centerButtonDisabled,
        ]}
        onPress={centerOnUser}
      >
        <Ionicons
          name="locate"
          size={20}
          color={userLocation ? COLORS.primary : COLORS.textTertiary}
        />
      </TouchableOpacity>

      <View style={styles.mapTypeToggle}>
        <MapTypeToggle currentType={mapType} onChange={setMapType} />
      </View>


      <Text style={styles.attribution}>
        {mapType === "satellite"
          ? "© Google"
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
  container: {
    flex: 3,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
  mapTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 32, 12, 0.16)",
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
    bottom: 20,
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.glassStrong,
    borderWidth: 1,
    borderColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  centerButtonDisabled: {
    opacity: 0.4,
  },
  mapTypeToggle: {
    position: "absolute",
    right: 10,
    top: 10,
  },
  attribution: {
    position: "absolute",
    bottom: 2,
    right: 10,
    fontSize: 9,
    color: "rgba(255,255,255,0.72)",
  },
});
