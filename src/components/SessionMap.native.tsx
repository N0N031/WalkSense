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

const TILES = {
  osm: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  ign: "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILECOL={x}&TILEROW={y}",
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

  const tileUrlTemplate =
    mapType === "ign" ? TILES.ign : mapType === "osm" ? TILES.osm : undefined;

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
        maxZoomLevel={19}
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
            maximumZ={19}
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
          : mapType === "ign"
            ? "© IGN Geoportail"
            : "© OpenStreetMap contributors"}
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
    left: 10,
    right: 10,
    bottom: 14,
  },
  attribution: {
    position: "absolute",
    bottom: 2,
    right: 10,
    fontSize: 9,
    color: "rgba(255,255,255,0.72)",
  },
});
