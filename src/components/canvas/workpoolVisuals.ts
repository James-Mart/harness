import { MarkerType } from "@xyflow/react";

import type { HarnessFlowEdge } from "@/components/canvas/flowTypes";
import { appendEdgeId } from "@/model/workpoolGraph";
import type { Concurrency, LeafNode, NodeId } from "@/model/types";

/** Short label for a container concurrency policy badge. */
export function concurrencyBadgeLabel(concurrency: Concurrency): string {
  if (concurrency.kind === "sequential") return "seq";
  const max = concurrency.maxConcurrency;
  if (max === undefined) return "∥ ∞";
  return `∥ ≤${max}`;
}

/** Dashed animated React Flow edge for a leaf's `appendsTo` relationship. */
export function toAppendFlowEdge(
  leaf: Pick<LeafNode, "id"> & { appendsTo: NodeId },
): HarnessFlowEdge {
  return {
    id: appendEdgeId(leaf.id, leaf.appendsTo),
    source: leaf.id,
    target: leaf.appendsTo,
    type: "smoothstep",
    label: "append",
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: "var(--muted-foreground)",
    },
    style: {
      stroke: "var(--muted-foreground)",
      strokeWidth: 1.5,
      strokeDasharray: "5 4",
    },
    data: { kind: "append" as const },
  };
}
