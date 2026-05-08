import React from "react";
import { StyleSheet, Text } from "react-native";
import { Circle, Marker } from "react-native-maps";

import type { CoverageCellEntity } from "@/src/data/gridEntities";
import { getGridStyle, getGridSymbol } from "@/src/constants/gridColors";

interface GridOverlayProps {
  cells: CoverageCellEntity[];
  isVisible?: boolean;
  maxCells?: number;
}

export default function GridOverlay({
  cells,
  isVisible = true,
  maxCells = 100,
}: GridOverlayProps) {
  if (!isVisible || cells.length === 0) return null;

  return (
    <>
      {cells.slice(0, maxCells).map((cell) => {
        const style = getGridStyle(cell.confidenceLevel);
        const symbol = getGridSymbol(cell.confidenceLevel);

        return (
          <React.Fragment key={cell.cellId}>
            <Circle
              center={{
                latitude: cell.centerLat,
                longitude: cell.centerLon,
              }}
              radius={cell.radiusUsedMeters}
              fillColor={withOpacity(style.fill, style.opacity)}
              strokeColor={style.stroke}
              strokeWidth={1}
              zIndex={1}
            />
            <Marker
              coordinate={{
                latitude: cell.centerLat,
                longitude: cell.centerLon,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={2}
            >
              <Text style={[styles.symbol, { color: style.symbolColor }]}>
                {symbol}
              </Text>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}

function withOpacity(hex: string, opacity: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const styles = StyleSheet.create({
  symbol: {
    fontSize: 14,
    fontWeight: "800",
  },
});
