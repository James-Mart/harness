import { type NodeProps } from "@xyflow/react";

import { ExecHandles } from "@/components/canvas/ExecHandles";
import type { HelperFlowNode } from "@/components/canvas/flowTypes";
import {
  FLOW_LAYOUT,
  flowLayoutCssVars,
} from "@/components/canvas/layoutTokens";
import { cn } from "@/lib/utils";

/**
 * Synthetic body-helper node (Exec / Variables / Output). Non-interactive;
 * selection/drag/delete are disabled on the flow node itself.
 */
export function HelperFlowNodeView({ id, data }: NodeProps<HelperFlowNode>) {
  const showExecOut = data.kind === "exec";

  return (
    <div
      className={cn(
        "bg-card text-card-foreground relative h-full w-full rounded-md border border-dashed shadow-sm",
      )}
      style={flowLayoutCssVars}
      data-testid={`flow-node-${id}`}
      data-kind="helper"
      data-helper-kind={data.kind}
    >
      <div
        className="flex h-full items-center"
        style={{
          paddingLeft: "var(--flow-port-label-inset)",
          paddingRight: "var(--flow-port-label-inset)",
        }}
      >
        <p className="text-sm font-medium leading-none">{data.title}</p>
      </div>
      {showExecOut ? (
        <ExecHandles
          branches={data.execOutBranches ?? [undefined]}
          bandTop={
            (FLOW_LAYOUT.helperNodeHeight - FLOW_LAYOUT.execBranchHandleStep) /
            2
          }
          showIn={false}
        />
      ) : null}
    </div>
  );
}
