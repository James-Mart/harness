import type { ReactNode } from "react";

import {
  advisoryCueLabel,
  advisoryCueTestId,
} from "@/components/canvas/advisoryVisuals";
import { cn } from "@/lib/utils";
import type { AdvisoryCue } from "@/model/advisoryCueTypes";

/** Amber badge row for advisory (non-blocking) validation cues. */
export function AdvisoryCueBadges({
  cues,
}: {
  cues: readonly AdvisoryCue[];
}): ReactNode {
  if (cues.length === 0) return null;
  return (
    <div
      className="mt-1 flex flex-nowrap gap-1 overflow-hidden"
      data-testid="advisory-cues"
    >
      {cues.map((cue) => (
        <span
          key={cue}
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] leading-none font-medium tracking-wide uppercase",
            "border border-amber-600/40 bg-amber-500/15 text-amber-900",
          )}
          data-testid={advisoryCueTestId(cue)}
          data-advisory="true"
        >
          {advisoryCueLabel(cue)}
        </span>
      ))}
    </div>
  );
}
