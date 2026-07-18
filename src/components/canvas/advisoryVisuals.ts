import type { AdvisoryCue } from "@/model/advisoryCueTypes";

/** Short canvas label for an advisory cue. */
export function advisoryCueLabel(cue: AdvisoryCue): string {
  switch (cue) {
    case "missing-appender":
      return "no append";
    case "missing-fixpoint":
      return "no fixpoint";
    case "unwired-required":
      return "needs wire";
    case "multi-wire-input":
      return "multi wire";
  }
}

/** Stable test id for an advisory cue badge. */
export function advisoryCueTestId(cue: AdvisoryCue): string {
  return `cue-${cue}`;
}
