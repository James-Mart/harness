import type { HarnessFlowNode } from "@/components/canvas/flowTypes";

/** Geometry fields used to resolve absolute flow-space rects. */
export type FlowGeometryNode = Pick<
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

/** Flow nodes that float on the open canvas (model roots; helpers excluded). */
export function harnessRootFlowNodes<T extends FlowGeometryNode>(
  nodes: readonly T[],
): T[] {
  return nodes.filter(
    (node) => node.parentId === undefined && node.type !== "helper",
  );
}

/** Absolute (flow-coordinate) bounding box of a rendered node. */
export type FlowRect = { x: number; y: number; width: number; height: number };

export function numericStyle(
  value: number | string | undefined,
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function nodeSize(node: FlowGeometryNode): {
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

/**
 * Absolute position in flow coordinates. Walks the parent chain with a cycle
 * guard so arbitrary node order is safe.
 */
export function absolutePosition(
  nodeId: string,
  byId: Map<string, FlowGeometryNode>,
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current: FlowGeometryNode | undefined = byId.get(nodeId);
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

export function nodeRect(
  node: FlowGeometryNode,
  byId: Map<string, FlowGeometryNode>,
): FlowRect {
  const { x, y } = absolutePosition(node.id, byId);
  const { width, height } = nodeSize(node);
  return { x, y, width, height };
}

/** Absolute bounding boxes for every flow node (order-independent). */
export function flowNodeRects(
  nodes: readonly FlowGeometryNode[],
): Map<string, FlowRect> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const rects = new Map<string, FlowRect>();
  for (const node of nodes) {
    rects.set(node.id, nodeRect(node, byId));
  }
  return rects;
}

/** Axis-aligned overlap (touching edges do not count). */
export function rectsOverlap(a: FlowRect, b: FlowRect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** True when `child` lies entirely inside `parent` (inclusive edges). */
export function containsRect(parent: FlowRect, child: FlowRect): boolean {
  return (
    child.x >= parent.x &&
    child.y >= parent.y &&
    child.x + child.width <= parent.x + parent.width &&
    child.y + child.height <= parent.y + parent.height
  );
}
