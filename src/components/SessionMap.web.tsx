import { COLORS } from "@/src/constants/colors";
import { MapType, MapTypeToggle } from "@/src/components/MapTypeToggle";
import { GpsPoint, MarkedEvent } from "@/src/services/sessionService";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export interface SessionMapProps {
  gpsTrace: GpsPoint[];
  userLocation: { latitude: number; longitude: number } | null;
  events: MarkedEvent[];
  onEventPress: (event: MarkedEvent) => void;
  historicalTraces?: GpsPoint[][];
  controlsTopOffset?: number;
  controlsPlacement?: "floating" | "header";
  mapType?: MapType;
}

export interface SessionMapHandle {
  centerOnUser: () => void;
  fitTrace: () => void;
}

function SessionMap({
  events,
  userLocation,
  controlsTopOffset = 12,
  mapType: controlledMapType,
}: SessionMapProps, ref: React.Ref<SessionMapHandle>) {
  const [internalMapType, setMapType] = useState<MapType>("google");
  const mapType = controlledMapType ?? internalMapType;

  useImperativeHandle(
    ref,
    () => ({
      centerOnUser: () => undefined,
      fitTrace: () => undefined,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.label}>Carte GPS</Text>
      <Text style={styles.sub}>Non disponible sur le Web</Text>
      {userLocation ? (
        <Text style={styles.location}>
          Position: {userLocation.latitude.toFixed(5)},{" "}
          {userLocation.longitude.toFixed(5)}
        </Text>
      ) : null}
      {events.length > 0 && (
        <Text style={styles.count}>{events.length} marqueur(s)</Text>
      )}
      <View style={[styles.toggle, { top: controlsTopOffset }]}>
        <MapTypeToggle currentType={mapType} onChange={setMapType} />
      </View>
    </View>
  );
}

export default forwardRef(SessionMap);

const styles = StyleSheet.create({
  container: {
    flex: 3,
    backgroundColor: "#f0ede5",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    fontSize: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  sub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  location: {
    fontSize: 12,
    color: COLORS.info,
  },
  count: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  toggle: {
    position: "absolute",
    right: 16,
  },
});
