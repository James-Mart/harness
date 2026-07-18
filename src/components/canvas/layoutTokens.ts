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
  /** Vertical step / row height for stacked exec-out handles. */
  execBranchHandleStep: 14,
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

/** Height of the exec-out stack band for `outCount` handles (min 1 slot). */
export function execBandHeight(outCount: number): number {
  const count = Math.max(1, outCount);
  return count * FLOW_LAYOUT.execBranchHandleStep;
}

/**
 * Y centers for exec-out handles in a band starting at `bandTop`
 * (leaf: below title header; container: header-local pad).
 */
export function execOutHandleTops(
  outCount: number,
  bandTop: number = FLOW_LAYOUT.leafHeaderHeight,
): number[] {
  const count = Math.max(1, outCount);
  return portHandleTopsInBand(count, bandTop, execBandHeight(count));
}

/** Y center for the exec-in handle — aligns with the first exec-out row. */
export function execInHandleTop(
  outCount: number = 1,
  bandTop: number = FLOW_LAYOUT.leafHeaderHeight,
): number {
  return execOutHandleTops(outCount, bandTop)[0]!;
}

/**
 * Leaf data-port centers: under the title header and exec-out band.
 * `execOutCount` defaults to 1 (unbranched `$exec-out`).
 */
export function leafPortHandleTops(
  count: number,
  execOutCount: number = 1,
): number[] {
  if (count <= 0) return [];
  const dataTop = FLOW_LAYOUT.leafHeaderHeight + execBandHeight(execOutCount);
  return Array.from(
    { length: count },
    (_, index) => dataTop + (index + 0.5) * FLOW_LAYOUT.portRowHeight,
  );
}

/**
 * Container data ports live in the header band below the exec stack
 * (header-local Y).
 */
export function containerHeaderPortHandleTops(
  count: number,
  execOutCount: number = 1,
): number[] {
  const pad = FLOW_LAYOUT.containerHeaderPortPadY;
  const execH = execBandHeight(execOutCount);
  const bandTop = pad + execH;
  const bandHeight = Math.max(
    FLOW_LAYOUT.portRowHeight,
    FLOW_LAYOUT.containerHeaderHeight - pad * 2 - execH,
  );
  return portHandleTopsInBand(count, bandTop, bandHeight);
}

/** Container exec-out tops — header-local, above the data-port band. */
export function containerExecOutHandleTops(outCount: number = 1): number[] {
  return execOutHandleTops(outCount, FLOW_LAYOUT.containerHeaderPortPadY);
}

/** Container exec-in top — header-local, aligned with first exec-out. */
export function containerExecInHandleTop(outCount: number = 1): number {
  return execInHandleTop(outCount, FLOW_LAYOUT.containerHeaderPortPadY);
}

/**
 * Leaf node height from data-port rows + exec-out stack — same tokens as
 * `leafPortHandleTops` / `execOutHandleTops`.
 */
export function leafHeightForPortCount(
  portRows: number,
  execOutCount: number = 1,
): number {
  const rows = Math.max(1, portRows);
  return Math.max(
    FLOW_LAYOUT.leafMinHeight,
    FLOW_LAYOUT.leafHeaderHeight +
      execBandHeight(execOutCount) +
      rows * FLOW_LAYOUT.portRowHeight +
      FLOW_LAYOUT.leafPadY,
  );
}
