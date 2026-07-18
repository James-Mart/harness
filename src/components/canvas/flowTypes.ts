import type { Node } from "@xyflow/react";

import type { Port } from "@/model/types";

export type LeafFlowData = {
  title: string;
  catalogType: string;
  ports: Port[];
  /** Exec-out slots derived from harness edges / schema. */
  execOutBranches: (string | undefined)[];
  isGate?: boolean;
};

export type ContainerFlowData = {
  title: string;
  catalogType: string;
  ports: Port[];
  execOutBranches: (string | undefined)[];
  iterablePortId: string;
  sourceKind: "snapshot" | "live";
};

export type HarnessFlowData = LeafFlowData | ContainerFlowData;

export type LeafFlowNode = Node<LeafFlowData, "leaf">;
export type ContainerFlowNode = Node<ContainerFlowData, "container">;
export type HarnessFlowNode = LeafFlowNode | ContainerFlowNode;
