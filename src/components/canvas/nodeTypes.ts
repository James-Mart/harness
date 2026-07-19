import type { NodeTypes } from "@xyflow/react";

import { ContainerFlowNodeView } from "@/components/canvas/ContainerFlowNode";
import { HelperFlowNodeView } from "@/components/canvas/HelperFlowNode";
import { LeafFlowNodeView } from "@/components/canvas/LeafFlowNode";

export const harnessNodeTypes = {
  leaf: LeafFlowNodeView,
  container: ContainerFlowNodeView,
  helper: HelperFlowNodeView,
} satisfies NodeTypes;
