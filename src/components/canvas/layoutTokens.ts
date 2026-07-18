import type { CSSProperties } from "react";

/** Shared geometry for harness→flow layout and node chrome. */
export const FLOW_LAYOUT = {
  leafWidth: 196,
  leafMinHeight: 64,
  leafHeaderHeight: 36,
  portRowHeight: 18,
  leafPadY: 10,
  /** Horizontal inset for port labels / title clearance. */
  portLabelInsetX: 10,
  containerMinWidth: 260,
  containerPadX: 20,
  containerPadY: 16,
  containerHeaderHeight: 52,
  /** Vertical pad inside the container header port band. */
  containerHeaderPortPadY: 8,
  childGap: 12,
  topLevelGap: 48,
} as const;

/** CSS variables mirroring `FLOW_LAYOUT` for leaf + container node views. */
export const flowLayoutCssVars = {
  "--flow-leaf-header-height": `${FLOW_LAYOUT.leafHeaderHeight}px`,
  "--flow-leaf-pad-y": `${FLOW_LAYOUT.leafPadY}px`,
  "--flow-port-label-inset": `${FLOW_LAYOUT.portLabelInsetX}px`,
  "--flow-container-header-height": `${FLOW_LAYOUT.containerHeaderHeight}px`,
  "--flow-container-pad-x": `${FLOW_LAYOUT.containerPadX}px`,
  "--flow-container-pad-y": `${FLOW_LAYOUT.containerPadY}px`,
} as CSSProperties;

/**
 * Center Y for each handle in a vertical band — same math for leaf rows
 * (fixed row height) and the container header (band height / count).
 */
export function portHandleTopsInBand(
  count: number,
  bandTop: number,
  bandHeight: number,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [bandTop + bandHeight / 2];
  const step = bandHeight / count;
  return Array.from(
    { length: count },
    (_, index) => bandTop + (index + 0.5) * step,
  );
}

/** Leaf port centers: one fixed-height row under the header. */
export function leafPortHandleTops(count: number): number[] {
  if (count <= 0) return [];
  return Array.from(
    { length: count },
    (_, index) =>
      FLOW_LAYOUT.leafHeaderHeight + (index + 0.5) * FLOW_LAYOUT.portRowHeight,
  );
}

/** Container ports live only in the header band (header-local Y). */
export function containerHeaderPortHandleTops(count: number): number[] {
  const pad = FLOW_LAYOUT.containerHeaderPortPadY;
  return portHandleTopsInBand(
    count,
    pad,
    FLOW_LAYOUT.containerHeaderHeight - pad * 2,
  );
}

/**
 * Leaf node height from the busier port side — derived from the same
 * header + row + pad tokens as `leafPortHandleTops`.
 */
export function leafHeightForPortCount(portRows: number): number {
  const rows = Math.max(1, portRows);
  return Math.max(
    FLOW_LAYOUT.leafMinHeight,
    FLOW_LAYOUT.leafHeaderHeight +
      rows * FLOW_LAYOUT.portRowHeight +
      FLOW_LAYOUT.leafPadY,
  );
}
