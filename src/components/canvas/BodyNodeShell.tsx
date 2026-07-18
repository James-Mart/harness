import type { ReactNode } from "react";

import { ExecHandles } from "@/components/canvas/ExecHandles";
import {
  FLOW_LAYOUT,
  containerHeaderPortHandleTops,
  flowLayoutCssVars,
} from "@/components/canvas/layoutTokens";
import { NodePortHandles } from "@/components/canvas/NodePortHandles";
import { cn } from "@/lib/utils";
import type { Port } from "@/model/types";

type BodyNodeShellProps = {
  id: string;
  title: string;
  subtitle: string;
  selected?: boolean;
  ports: readonly Port[];
  /** When set, render exec handles and reserve header space for them. */
  execOutBranches?: readonly (string | undefined)[];
  kind: "container" | "harness";
  className?: string;
  headerClassName?: string;
  bodyTestId: string;
  /** Optional badge row under the subtitle (work-pool affordances). */
  badges?: ReactNode;
};

/**
 * Shared chrome for container and harness-boundary nodes: header with
 * title/subtitle, optional exec band, data ports, and an empty body slot.
 */
export function BodyNodeShell({
  id,
  title,
  subtitle,
  selected,
  ports,
  execOutBranches,
  kind,
  className,
  headerClassName,
  bodyTestId,
  badges,
}: BodyNodeShellProps): ReactNode {
  const execOutCount =
    execOutBranches === undefined ? 0 : Math.max(1, execOutBranches.length);
  const headerHeight =
    kind === "harness"
      ? FLOW_LAYOUT.harnessHeaderHeight
      : FLOW_LAYOUT.containerHeaderHeight;
  const dataHandleTops = (count: number) =>
    containerHeaderPortHandleTops(count, execOutCount, headerHeight);

  return (
    <div
      className={cn(
        "text-card-foreground relative h-full w-full border-2",
        selected && "border-ring ring-ring/30 ring-2",
        className,
      )}
      style={flowLayoutCssVars}
      data-testid={`flow-node-${id}`}
      data-kind={kind}
    >
      <div
        className={cn("border-border relative border-b", headerClassName)}
        style={{ height: headerHeight }}
      >
        <div
          className="flex h-full min-w-0 items-start"
          style={{
            paddingLeft: "var(--flow-port-label-inset)",
            paddingRight: "var(--flow-port-label-inset)",
            paddingTop: "0.5rem",
          }}
        >
          <div className="min-w-0 overflow-hidden">
            <p className="text-sm font-medium leading-tight">{title}</p>
            <p className="text-muted-foreground mt-0.5 text-[0.65rem] tracking-wide uppercase">
              {subtitle}
            </p>
            {badges ? (
              <div className="mt-1 flex flex-nowrap gap-1 overflow-hidden">
                {badges}
              </div>
            ) : null}
          </div>
        </div>
        {execOutBranches !== undefined ? (
          <ExecHandles
            branches={execOutBranches}
            bandTop={FLOW_LAYOUT.containerHeaderPortPadY}
          />
        ) : null}
        <NodePortHandles ports={ports} handleTops={dataHandleTops} />
      </div>
      <div
        className="w-full"
        style={{ height: `calc(100% - ${headerHeight}px)` }}
        data-testid={bodyTestId}
        aria-label={`${title} body`}
      />
    </div>
  );
}
