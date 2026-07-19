import type { FlowGeometryNode } from "@/authoring/flowGeometry";
import { nodeRect } from "@/authoring/flowGeometry";
import { isAncestorOf } from "@/model/ancestry";
import type { NodeId } from "@/model/types";

/** Geometry fields used to resolve drop-target containment. */
export type ContainmentFlowNode = FlowGeometryNode;

function containsPoint(
  rect: { x: number; y: number; width: number; height: number },
  point: { x: number; y: number },
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function nestingDepth(
  nodeId: string,
  byId: Map<string, ContainmentFlowNode>,
): number {
  let depth = 0;
  let current: ContainmentFlowNode | undefined = byId.get(nodeId);
  const seen = new Set<string>();
  while (current?.parentId !== undefined) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    depth += 1;
    current = byId.get(current.parentId);
  }
  return depth;
}

/**
 * Resolve the harness model `parentId` after a node drag stops.
 *
 * Hits the deepest container whose bounds contain the dragged node's center.
 * Open canvas (no container hit) maps to `undefined` (top-level). Leaves and
 * helpers are never parents. Targets under the dragged node are ignored so
 * cycles cannot form.
 */
export function resolveContainmentParent(
  draggedId: string,
  flowNodes: readonly ContainmentFlowNode[],
): NodeId | undefined {
  const byId = new Map(flowNodes.map((node) => [node.id, node]));
  const dragged = byId.get(draggedId);
  if (!dragged) return undefined;

  const draggedRect = nodeRect(dragged, byId);
  const center = {
    x: draggedRect.x + draggedRect.width / 2,
    y: draggedRect.y + draggedRect.height / 2,
  };

  const candidates = flowNodes.filter((node) => {
    if (node.id === draggedId) return false;
    if (node.type !== "container") return false;
    // Do not parent into a descendant of the dragged node.
    if (isAncestorOf((id) => byId.get(id)?.parentId, draggedId, node.id)) {
      return false;
    }
    return containsPoint(nodeRect(node, byId), center);
  });

  if (candidates.length === 0) return undefined;

  candidates.sort(
    (a, b) => nestingDepth(b.id, byId) - nestingDepth(a.id, byId),
  );
  return candidates[0]!.id;
}
