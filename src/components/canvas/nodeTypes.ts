import type { NodeTypes } from "@xyflow/react";

import { ContainerFlowNodeView } from "@/components/canvas/ContainerFlowNode";
import { HarnessBoundaryNodeView } from "@/components/canvas/HarnessBoundaryNode";
import { HelperFlowNodeView } from "@/components/canvas/HelperFlowNode";
import { LeafFlowNodeView } from "@/components/canvas/LeafFlowNode";

export const harnessNodeTypes = {
  leaf: LeafFlowNodeView,
  container: ContainerFlowNodeView,
  harness: HarnessBoundaryNodeView,
  helper: HelperFlowNodeView,
} satisfies NodeTypes;
