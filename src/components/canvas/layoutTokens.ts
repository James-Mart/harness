import type { CSSProperties } from "react";

/** Shared geometry for harness→flow layout and node chrome. */
export const FLOW_LAYOUT = {
  leafWidth: 196,
  leafMinHeight: 64,
  leafHeaderHeight: 36,
  /** Extra header room for the fan-out append marker line. */
  leafFanOutMarkerHeight: 14,
  portRowHeight: 18,
  leafPadY: 10,
  /** Horizontal inset for port labels / title clearance. */
  portLabelInsetX: 10,
  /** Vertical step / row height for stacked exec-out handles. */
  execBranchHandleStep: 14,
  containerMinWidth: 260,
  containerPadX: 20,
  containerPadY: 16,
  /** Title + subtitle only (harness boundary has no badge row). */
  harnessHeaderHeight: 52,
  /** Title + subtitle + single-line work-pool badge row. */
  containerHeaderHeight: 72,
  /** Extra header room when advisory cue badges are present. */
  advisoryCueRowHeight: 18,
  /** Vertical pad inside the container header port band. */
  containerHeaderPortPadY: 8,
  childGap: 12,
  topLevelGap: 48,
} as const;

export type LeafLayoutOptions = {
  hasFanOutMarker?: boolean;
  hasAdvisoryCues?: boolean;
};
export type ContainerLayoutOptions = { hasAdvisoryCues?: boolean };

/** Leaf title-band height, including optional fan-out / cue rows. */
export function leafTitleHeaderHeight(options: LeafLayoutOptions = {}): number {
  return (
    FLOW_LAYOUT.leafHeaderHeight +
    (options.hasFanOutMarker ? FLOW_LAYOUT.leafFanOutMarkerHeight : 0) +
    (options.hasAdvisoryCues ? FLOW_LAYOUT.advisoryCueRowHeight : 0)
  );
}

/** Container chrome header height, including optional advisory cue row. */
export function containerChromeHeaderHeight(
  options: ContainerLayoutOptions = {},
): number {
  return (
    FLOW_LAYOUT.containerHeaderHeight +
    (options.hasAdvisoryCues ? FLOW_LAYOUT.advisoryCueRowHeight : 0)
  );
}

/** CSS variables mirroring `FLOW_LAYOUT` for leaf + container node views. */
export const flowLayoutCssVars = {
  "--flow-leaf-header-height": `${FLOW_LAYOUT.leafHeaderHeight}px`,
  "--flow-leaf-pad-y": `${FLOW_LAYOUT.leafPadY}px`,
  "--flow-port-label-inset": `${FLOW_LAYOUT.portLabelInsetX}px`,
  "--flow-container-header-height": `${FLOW_LAYOUT.containerHeaderHeight}px`,
  "--flow-harness-header-height": `${FLOW_LAYOUT.harnessHeaderHeight}px`,
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
  options: LeafLayoutOptions = {},
): number[] {
  if (count <= 0) return [];
  const dataTop = leafTitleHeaderHeight(options) + execBandHeight(execOutCount);
  return Array.from(
    { length: count },
    (_, index) => dataTop + (index + 0.5) * FLOW_LAYOUT.portRowHeight,
  );
}

/**
 * Container / harness-boundary data ports in the header band
 * (header-local Y). Pass `execOutCount === 0` for no exec stack
 * (harness boundary).
 */
export function containerHeaderPortHandleTops(
  count: number,
  execOutCount: number = 1,
  headerHeight: number = FLOW_LAYOUT.containerHeaderHeight,
): number[] {
  const pad = FLOW_LAYOUT.containerHeaderPortPadY;
  const execH = execOutCount > 0 ? execBandHeight(execOutCount) : 0;
  const bandTop = pad + execH;
  const bandHeight = Math.max(
    FLOW_LAYOUT.portRowHeight,
    headerHeight - pad * 2 - execH,
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
  options: LeafLayoutOptions = {},
): number {
  const rows = Math.max(1, portRows);
  const header = leafTitleHeaderHeight(options);
  const headerExtra = header - FLOW_LAYOUT.leafHeaderHeight;
  return Math.max(
    FLOW_LAYOUT.leafMinHeight + headerExtra,
    header +
      execBandHeight(execOutCount) +
      rows * FLOW_LAYOUT.portRowHeight +
      FLOW_LAYOUT.leafPadY,
  );
}
