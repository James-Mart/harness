import { type NodeProps } from "@xyflow/react";

import type { LeafFlowNode } from "@/components/canvas/flowTypes";
import {
  flowLayoutCssVars,
  leafPortHandleTops,
} from "@/components/canvas/layoutTokens";
import { NodePortHandles } from "@/components/canvas/NodePortHandles";
import { cn } from "@/lib/utils";

export function LeafFlowNodeView({
  id,
  data,
  selected,
}: NodeProps<LeafFlowNode>) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground relative h-full w-full rounded-lg border shadow-sm",
        selected && "border-ring ring-ring/40 ring-2",
        data.isGate && "border-dashed",
      )}
      style={flowLayoutCssVars}
      data-testid={`flow-node-${id}`}
      data-kind="leaf"
    >
      <div
        style={{
          height: "var(--flow-leaf-header-height)",
          paddingLeft: "var(--flow-port-label-inset)",
          paddingRight: "var(--flow-port-label-inset)",
        }}
      >
        <p className="text-sm font-medium leading-tight">{data.title}</p>
        <p className="text-muted-foreground mt-0.5 text-[0.65rem] tracking-wide uppercase">
          {data.catalogType}
          {data.isGate ? " · gate" : ""}
        </p>
      </div>
      <NodePortHandles ports={data.ports} handleTops={leafPortHandleTops} />
    </div>
  );
}
