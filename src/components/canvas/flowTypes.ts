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

/** Outer harness shell — boundary signature ports only. */
export type HarnessBoundaryFlowData = {
  title: string;
  ports: Port[];
};

export type HarnessFlowData =
  LeafFlowData | ContainerFlowData | HarnessBoundaryFlowData;

export type LeafFlowNode = Node<LeafFlowData, "leaf">;
export type ContainerFlowNode = Node<ContainerFlowData, "container">;
export type HarnessBoundaryFlowNode = Node<HarnessBoundaryFlowData, "harness">;
export type HarnessFlowNode =
  LeafFlowNode | ContainerFlowNode | HarnessBoundaryFlowNode;
