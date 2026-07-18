import { type NodeProps } from "@xyflow/react";

import type { LeafFlowNode } from "@/components/canvas/flowTypes";
import { cn } from "@/lib/utils";

export function LeafFlowNodeView({
  id,
  data,
  selected,
}: NodeProps<LeafFlowNode>) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground min-w-[10rem] rounded-lg border px-3 py-2 shadow-sm",
        selected && "border-ring ring-ring/40 ring-2",
        data.isGate && "border-dashed",
      )}
      data-testid={`flow-node-${id}`}
      data-kind="leaf"
    >
      <p className="text-sm font-medium leading-tight">{data.title}</p>
      <p className="text-muted-foreground mt-0.5 text-[0.65rem] tracking-wide uppercase">
        {data.catalogType}
        {data.isGate ? " · gate" : ""}
      </p>
    </div>
  );
}
