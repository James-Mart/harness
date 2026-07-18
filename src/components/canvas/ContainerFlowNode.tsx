import { type NodeProps } from "@xyflow/react";

import type { ContainerFlowNode } from "@/components/canvas/flowTypes";
import {
  containerHeaderPortHandleTops,
  flowLayoutCssVars,
} from "@/components/canvas/layoutTokens";
import { NodePortHandles } from "@/components/canvas/NodePortHandles";
import { cn } from "@/lib/utils";

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
        className="border-border/70 relative border-b border-dashed"
        style={{ height: "var(--flow-container-header-height)" }}
      >
        <div
          className="flex h-full min-w-0 items-start"
          style={{
            paddingLeft: "var(--flow-port-label-inset)",
            paddingRight: "var(--flow-port-label-inset)",
            paddingTop: "0.5rem",
          }}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{data.title}</p>
            <p className="text-muted-foreground mt-0.5 text-[0.65rem] tracking-wide uppercase">
              {data.catalogType} · {data.sourceKind}
            </p>
          </div>
        </div>
        {/* Header-local relative shell — tops stay in the header as body grows. */}
        <NodePortHandles
          ports={data.ports}
          handleTops={containerHeaderPortHandleTops}
        />
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
