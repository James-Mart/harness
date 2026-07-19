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
  className?: string;
  headerClassName?: string;
  bodyTestId: string;
  /** Optional badge / cue rows under the subtitle (work-pool affordances). */
  badges?: ReactNode;
  /**
   * Explicit header height (e.g. `containerChromeHeaderHeight`). When omitted,
   * uses `containerHeaderHeight`.
   */
  headerHeight?: number;
};

/**
 * Shared chrome for container nodes: header with title/subtitle, optional
 * exec band, data ports, and an empty body slot.
 */
export function BodyNodeShell({
  id,
  title,
  subtitle,
  selected,
  ports,
  execOutBranches,
  className,
  headerClassName,
  bodyTestId,
  badges,
  headerHeight: headerHeightProp,
}: BodyNodeShellProps): ReactNode {
  const execOutCount =
    execOutBranches === undefined
      ? 0
      : // Empty branches = exec-in only (body outs live on the Exec helper).
        Math.max(execOutBranches.length, 1);
  const headerHeight =
    headerHeightProp ?? FLOW_LAYOUT.containerHeaderHeight;
  const dataHandleTops = (count: number) =>
    containerHeaderPortHandleTops(count, execOutCount, headerHeight);
  const cssVars = {
    ...flowLayoutCssVars,
    "--flow-container-header-height": `${headerHeight}px`,
  };

  return (
    <div
      className={cn(
        "text-card-foreground relative h-full w-full border-2",
        selected && "border-ring ring-ring/30 ring-2",
        className,
      )}
      style={cssVars}
      data-testid={`flow-node-${id}`}
      data-kind="container"
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
            {badges}
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
