import { type NodeProps } from "@xyflow/react";

import { BodyNodeShell } from "@/components/canvas/BodyNodeShell";
import type { ContainerFlowNode } from "@/components/canvas/flowTypes";

export function ContainerFlowNodeView({
  id,
  data,
  selected,
}: NodeProps<ContainerFlowNode>) {
  return (
    <BodyNodeShell
      id={id}
      title={data.title}
      subtitle={`${data.catalogType} · ${data.sourceKind}`}
      selected={selected}
      ports={data.ports}
      execOutBranches={data.execOutBranches}
      kind="container"
      className="bg-muted/40 rounded-xl border-dashed"
      headerClassName="border-border/70 border-dashed"
      bodyTestId="container-body"
    />
  );
}
