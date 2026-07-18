import { type NodeProps } from "@xyflow/react";

import type { ContainerFlowNode } from "@/components/canvas/flowTypes";
import { flowLayoutCssVars } from "@/components/canvas/layoutTokens";
import { cn } from "@/lib/utils";
import { CURRENT_ITEM_PORT_ID } from "@/model/types";

export function ContainerFlowNodeView({
  id,
  data,
  selected,
}: NodeProps<ContainerFlowNode>) {
  return (
    <div
      className={cn(
        "bg-muted/40 text-card-foreground relative h-full w-full rounded-xl border-2 border-dashed",
        selected && "border-ring ring-ring/30 ring-2",
      )}
      style={flowLayoutCssVars}
      data-testid={`flow-node-${id}`}
      data-kind="container"
    >
      <div
        className="border-border/70 flex items-start justify-between gap-2 border-b border-dashed px-3 py-2"
        style={{ height: "var(--flow-container-header-height)" }}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{data.title}</p>
          <p className="text-muted-foreground mt-0.5 text-[0.65rem] tracking-wide uppercase">
            {data.catalogType} · {data.sourceKind}
          </p>
        </div>
        <span
          className="bg-background text-foreground shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[0.65rem]"
          data-testid="current-item-port"
          title="Built-in container output for the current iteration element"
        >
          {CURRENT_ITEM_PORT_ID}
        </span>
      </div>
      <div
        className="w-full"
        style={{
          height: "calc(100% - var(--flow-container-header-height))",
        }}
        data-testid="container-body"
        aria-label={`${data.title} body`}
      />
    </div>
  );
}
