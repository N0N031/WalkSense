import type { CoverageCellEntity } from "@/src/data/gridEntities";

interface GridOverlayProps {
  cells: CoverageCellEntity[];
  isVisible?: boolean;
  maxCells?: number;
}

export default function GridOverlay(_props: GridOverlayProps) {
  return null;
}
