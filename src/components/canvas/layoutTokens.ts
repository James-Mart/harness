import type { CSSProperties } from "react";

/** Shared geometry for harness→flow layout and container chrome. */
export const FLOW_LAYOUT = {
  leafWidth: 168,
  leafHeight: 56,
  containerMinWidth: 240,
  containerPadX: 20,
  containerPadY: 16,
  containerHeaderHeight: 52,
  childGap: 12,
  topLevelGap: 48,
} as const;

/** CSS variables mirroring `FLOW_LAYOUT` for container node views. */
export const flowLayoutCssVars = {
  "--flow-container-header-height": `${FLOW_LAYOUT.containerHeaderHeight}px`,
  "--flow-container-pad-x": `${FLOW_LAYOUT.containerPadX}px`,
  "--flow-container-pad-y": `${FLOW_LAYOUT.containerPadY}px`,
} as CSSProperties;
