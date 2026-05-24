import type { ConfidenceLevel } from "@/src/data/gridEntities";

export const GRID_COLORS = {
  HIGH: {
    fill: "#22c55e",
    stroke: "#16a34a",
    opacity: 0.5,
    symbol: "●",
    symbolColor: "#16a34a",
  },
  MEDIUM: {
    fill: "#f97316",
    stroke: "#ea580c",
    opacity: 0.4,
    symbol: "◐",
    symbolColor: "#ea580c",
  },
  LOW: {
    fill: "#ef4444",
    stroke: "#dc2626",
    opacity: 0.3,
    symbol: "⚠︎",
    symbolColor: "#dc2626",
  },
} as const;

export const getGridStyle = (confidenceLevel: ConfidenceLevel) => {
  return GRID_COLORS[confidenceLevel];
};

export const getGridSymbol = (confidenceLevel: ConfidenceLevel) => {
  return GRID_COLORS[confidenceLevel].symbol;
};
