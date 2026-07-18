import { type NodeProps } from "@xyflow/react";

import { BodyNodeShell } from "@/components/canvas/BodyNodeShell";
import type { HarnessBoundaryFlowNode } from "@/components/canvas/flowTypes";

export function HarnessBoundaryNodeView({
  id,
  data,
  selected,
}: NodeProps<HarnessBoundaryFlowNode>) {
  return (
    <BodyNodeShell
      id={id}
      title={data.title}
      subtitle="harness · boundary"
      selected={selected}
      ports={data.ports}
      kind="harness"
      className="bg-card/60 rounded-2xl"
      bodyTestId="harness-body"
    />
  );
}
