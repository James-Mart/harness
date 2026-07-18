import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import { isAncestorOf } from "@/model/ancestry";
import type { NodeId } from "@/model/types";

/** Geometry fields used to resolve drop-target containment. */
export type ContainmentFlowNode = Pick<
  HarnessFlowNode,
  | "id"
  | "type"
  | "parentId"
  | "position"
  | "width"
  | "height"
  | "measured"
  | "style"
>;

type Rect = { x: number; y: number; width: number; height: number };

function numericStyle(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function nodeSize(node: ContainmentFlowNode): {
  width: number;
  height: number;
} {
  const width =
    node.measured?.width ??
    (typeof node.width === "number" ? node.width : undefined) ??
    numericStyle(node.style?.width) ??
    0;
  const height =
    node.measured?.height ??
    (typeof node.height === "number" ? node.height : undefined) ??
    numericStyle(node.style?.height) ??
    0;
  return { width, height };
}

function absolutePosition(
  nodeId: string,
  byId: Map<string, ContainmentFlowNode>,
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current: ContainmentFlowNode | undefined = byId.get(nodeId);
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    x += current.position.x;
    y += current.position.y;
    if (current.parentId === undefined) break;
    current = byId.get(current.parentId);
  }
  return { x, y };
}

function nodeRect(
  node: ContainmentFlowNode,
  byId: Map<string, ContainmentFlowNode>,
): Rect {
  const { x, y } = absolutePosition(node.id, byId);
  const { width, height } = nodeSize(node);
  return { x, y, width, height };
}

function containsPoint(rect: Rect, point: { x: number; y: number }): boolean {
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
 * Hits the deepest container (or harness shell) whose bounds contain the
 * dragged node's center. The harness shell maps to `undefined` (top-level).
 * Leaves are never parents. Targets under the dragged node are ignored so
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
    if (node.type !== "container" && node.type !== "harness") return false;
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
  const hit = candidates[0]!;
  if (hit.type === "harness") return undefined;
  return hit.id;
}
