import { type NodeProps } from "@xyflow/react";

import { ExecHandles } from "@/components/canvas/ExecHandles";
import type { LeafFlowNode } from "@/components/canvas/flowTypes";
import {
  flowLayoutCssVars,
  leafPortHandleTops,
  leafTitleHeaderHeight,
} from "@/components/canvas/layoutTokens";
import { NodePortHandles } from "@/components/canvas/NodePortHandles";
import { cn } from "@/lib/utils";

export function LeafFlowNodeView({
  id,
  data,
  selected,
}: NodeProps<LeafFlowNode>) {
  const execOutCount = Math.max(1, data.execOutBranches.length);
  const hasFanOut = data.appendsTo !== undefined;
  const layoutOptions = { hasFanOutMarker: hasFanOut };
  const headerHeight = leafTitleHeaderHeight(layoutOptions);
  const dataHandleTops = (count: number) =>
    leafPortHandleTops(count, execOutCount, layoutOptions);

  return (
    <div
      className={cn(
        "bg-card text-card-foreground relative h-full w-full rounded-lg border shadow-sm",
        selected && "border-ring ring-ring/40 ring-2",
        data.isGate && "border-dashed",
        hasFanOut && "border-foreground/40",
      )}
      style={flowLayoutCssVars}
      data-testid={`flow-node-${id}`}
      data-kind="leaf"
    >
      <div
        style={{
          height: `${headerHeight}px`,
          paddingLeft: "var(--flow-port-label-inset)",
          paddingRight: "var(--flow-port-label-inset)",
        }}
      >
        <p className="text-sm font-medium leading-tight">{data.title}</p>
        <p className="text-muted-foreground mt-0.5 text-[0.65rem] tracking-wide uppercase">
          {data.catalogType}
          {data.isGate ? " · gate" : ""}
        </p>
        {hasFanOut ? (
          <p
            className="text-foreground mt-0.5 text-[0.6rem] leading-none font-medium tracking-wide"
            data-testid="fan-out-marker"
            data-appends-to={data.appendsTo}
          >
            append → {data.appendsToTitle ?? data.appendsTo}
          </p>
        ) : null}
      </div>
      <ExecHandles branches={data.execOutBranches} bandTop={headerHeight} />
      <NodePortHandles ports={data.ports} handleTops={dataHandleTops} />
    </div>
  );
}
