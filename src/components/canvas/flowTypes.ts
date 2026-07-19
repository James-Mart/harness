import type { Edge, Node } from "@xyflow/react";

import type { AdvisoryCue } from "@/model/advisoryCueTypes";
import type { Concurrency, EndCondition, Port } from "@/model/types";

export type { AdvisoryCue };

export type LeafFlowData = {
  title: string;
  catalogType: string;
  ports: Port[];
  /** Exec-out slots derived from harness edges / schema. */
  execOutBranches: (string | undefined)[];
  isGate?: boolean;
  /** Effective gate enablement from run-config (gates only). */
  gateEnabled?: boolean;
  /** Live container this leaf appends into (fan-out). */
  appendsTo?: string;
  /** Display title of the append target (for the fan-out marker). */
  appendsToTitle?: string;
  /** Advisory (non-blocking) wiring cues for this leaf. */
  advisoryCues: readonly AdvisoryCue[];
};

export type ContainerFlowData = {
  title: string;
  catalogType: string;
  ports: Port[];
  execOutBranches: (string | undefined)[];
  iterablePortId: string;
  sourceKind: "snapshot" | "live";
  /** Effective concurrency (node policy + run-config override). */
  concurrency: Concurrency;
  end?: EndCondition;
  /** True when a body leaf declares `appendsTo` this container. */
  hasFanOut: boolean;
  /** Advisory (non-blocking) cues for this container (wiring + work-pool). */
  advisoryCues: readonly AdvisoryCue[];
};

/** Outer harness shell — boundary signature ports only. */
export type HarnessBoundaryFlowData = {
  title: string;
  ports: Port[];
};

/** Synthetic helper kinds pinned in a body's top or bottom strip. */
export type BodyHelperKind = "exec" | "variables" | "output";

/** Rendering-only body helper (Exec / Variables / Output). */
export type HelperFlowData = {
  kind: BodyHelperKind;
  title: string;
  ports: readonly Port[];
};

export type HarnessFlowData =
  | LeafFlowData
  | ContainerFlowData
  | HarnessBoundaryFlowData
  | HelperFlowData;

export type LeafFlowNode = Node<LeafFlowData, "leaf">;
export type ContainerFlowNode = Node<ContainerFlowData, "container">;
export type HarnessBoundaryFlowNode = Node<HarnessBoundaryFlowData, "harness">;
export type HelperFlowNode = Node<HelperFlowData, "helper">;
export type HarnessFlowNode =
  | LeafFlowNode
  | ContainerFlowNode
  | HarnessBoundaryFlowNode
  | HelperFlowNode;

export type DataFlowEdgeData = { kind: "data" };
export type ExecFlowEdgeData = { kind: "exec"; branch?: string };
export type AppendFlowEdgeData = { kind: "append" };
export type HarnessFlowEdgeData =
  DataFlowEdgeData | ExecFlowEdgeData | AppendFlowEdgeData;

export type HarnessFlowEdge = Edge<HarnessFlowEdgeData>;

/** Inspector view of a selected flow edge (endpoints + optional branch). */
export type InspectorEdgeView = {
  id: string;
  edgeKind: HarnessFlowEdgeData["kind"];
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  branch?: string;
};
