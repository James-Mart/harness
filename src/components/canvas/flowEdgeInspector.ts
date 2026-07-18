import type { Edge } from "@xyflow/react";

import type {
  HarnessFlowEdgeData,
  InspectorEdgeView,
} from "@/components/canvas/flowTypes";

function isHarnessFlowEdgeData(data: unknown): data is HarnessFlowEdgeData {
  if (data === null || typeof data !== "object") return false;
  const kind = (data as { kind?: unknown }).kind;
  return kind === "data" || kind === "exec" || kind === "append";
}

/** Map a React Flow edge into the inspector's endpoint view. */
export function flowEdgeToInspectorView(edge: Edge): InspectorEdgeView | null {
  if (!isHarnessFlowEdgeData(edge.data)) return null;
  const branch =
    edge.data.kind === "exec" && edge.data.branch !== undefined
      ? edge.data.branch
      : undefined;
  return {
    id: edge.id,
    edgeKind: edge.data.kind,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
    ...(branch !== undefined ? { branch } : {}),
  };
}
