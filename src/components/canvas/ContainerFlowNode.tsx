import { type NodeProps } from "@xyflow/react";

import { BodyNodeShell } from "@/components/canvas/BodyNodeShell";
import { ContainerBadges } from "@/components/canvas/ContainerBadges";
import type { ContainerFlowNode } from "@/components/canvas/flowTypes";
import { containerChromeHeaderHeight } from "@/components/canvas/layoutTokens";

export function ContainerFlowNodeView({
  id,
  data,
  selected,
}: NodeProps<ContainerFlowNode>) {
  const headerHeight = containerChromeHeaderHeight({
    hasAdvisoryCues: data.advisoryCues.length > 0,
  });

  return (
    <BodyNodeShell
      id={id}
      title={data.title}
      subtitle={data.catalogType}
      selected={selected}
      ports={data.ports}
      execOutBranches={data.execOutBranches}
      className="bg-muted/40 rounded-xl border-dashed"
      headerClassName="border-border/70 border-dashed"
      bodyTestId="container-body"
      headerHeight={headerHeight}
      badges={
        <ContainerBadges
          sourceKind={data.sourceKind}
          concurrency={data.concurrency}
          end={data.end}
          hasFanOut={data.hasFanOut}
          advisoryCues={data.advisoryCues}
        />
      }
    />
  );
}
