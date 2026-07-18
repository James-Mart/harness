import type { ReactNode } from "react";

import {
  advisoryCueLabel,
  advisoryCueTestId,
  concurrencyBadgeLabel,
} from "@/components/canvas/workpoolVisuals";
import { cn } from "@/lib/utils";
import type { WorkPoolAdvisoryCue } from "@/model/workpoolGraph";
import type { Concurrency, EndCondition } from "@/model/types";

type ContainerBadgesProps = {
  sourceKind: "snapshot" | "live";
  concurrency: Concurrency;
  end?: EndCondition;
  hasFanOut: boolean;
  advisoryCues?: readonly WorkPoolAdvisoryCue[];
};

function Badge({
  children,
  testId,
  emphasis = false,
  sourceKind,
  advisory = false,
}: {
  children: ReactNode;
  testId: string;
  emphasis?: boolean;
  sourceKind?: "snapshot" | "live";
  advisory?: boolean;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] leading-none font-medium tracking-wide uppercase",
        advisory
          ? "border border-amber-600/40 bg-amber-500/15 text-amber-900"
          : emphasis
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground border-border border",
      )}
      data-testid={testId}
      {...(sourceKind !== undefined ? { "data-source-kind": sourceKind } : {})}
      {...(advisory ? { "data-advisory": "true" } : {})}
    >
      {children}
    </span>
  );
}

/** Canvas affordances for source liveness, concurrency, fan-out, fixpoint. */
export function ContainerBadges({
  sourceKind,
  concurrency,
  end,
  hasFanOut,
  advisoryCues = [],
}: ContainerBadgesProps): ReactNode {
  return (
    <>
      <div className="mt-1 flex flex-nowrap gap-1 overflow-hidden">
        <Badge
          testId="source-marker"
          emphasis={sourceKind === "live"}
          sourceKind={sourceKind}
        >
          {sourceKind === "live" ? "live" : "snapshot"}
        </Badge>
        <Badge testId="concurrency-badge">
          {concurrencyBadgeLabel(concurrency)}
        </Badge>
        {end?.kind === "fixpoint" ? (
          <Badge testId="fixpoint-marker">fixpoint</Badge>
        ) : null}
        {hasFanOut ? (
          <Badge testId="fan-out-target-marker">fan-out</Badge>
        ) : null}
      </div>
      {advisoryCues.length > 0 ? (
        <div
          className="mt-1 flex flex-nowrap gap-1 overflow-hidden"
          data-testid="advisory-cues"
        >
          {advisoryCues.map((cue) => (
            <Badge key={cue} testId={advisoryCueTestId(cue)} advisory>
              {advisoryCueLabel(cue)}
            </Badge>
          ))}
        </div>
      ) : null}
    </>
  );
}
