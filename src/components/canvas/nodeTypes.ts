import type { NodeTypes } from "@xyflow/react";

import { ContainerFlowNodeView } from "@/components/canvas/ContainerFlowNode";
import { LeafFlowNodeView } from "@/components/canvas/LeafFlowNode";

export const harnessNodeTypes = {
  leaf: LeafFlowNodeView,
  container: ContainerFlowNodeView,
} satisfies NodeTypes;
