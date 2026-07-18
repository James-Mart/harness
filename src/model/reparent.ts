import { isAncestorOf } from "@/model/ancestry";
import type { Harness, Node, NodeId, NodePosition } from "@/model/types";

/** True when `nodeId` is `ancestorId` or nested under it. */
export function isUnder(
  harness: Harness,
  ancestorId: NodeId,
  nodeId: NodeId,
): boolean {
  const byId = new Map(harness.nodes.map((node) => [node.id, node]));
  return isAncestorOf((id) => byId.get(id)?.parentId, ancestorId, nodeId);
}

function stripParent(node: Node): Node {
  if (node.parentId === undefined) return node;
  const rest = { ...node };
  delete rest.parentId;
  return rest;
}

function stripPosition(node: Node): Node {
  if (node.position === undefined) return node;
  const rest = { ...node };
  delete rest.position;
  return rest;
}

/**
 * Apply parent change. Nesting clears persisted top-level `position`;
 * un-nesting leaves position unset (drag-stop / placeNode writes it).
 */
function withParent(node: Node, parentId: NodeId | undefined): Node {
  if (parentId === undefined) {
    return stripParent(node);
  }
  const nested = node.parentId === parentId ? node : { ...node, parentId };
  return stripPosition(nested);
}

/**
 * Set a node's container parent (`undefined` = top-level under the harness).
 * Rejects unknown ids, non-container parents, and cycles. Nesting clears
 * `position`. No-ops return the same harness reference.
 */
export function reparentNode(
  harness: Harness,
  nodeId: NodeId,
  parentId: NodeId | undefined,
): Harness {
  const node = harness.nodes.find((entry) => entry.id === nodeId);
  if (!node) return harness;

  if (parentId !== undefined) {
    const parent = harness.nodes.find((entry) => entry.id === parentId);
    if (!parent || parent.kind !== "container") return harness;
    // Parenting into self or a descendant would cycle the tree.
    if (isUnder(harness, nodeId, parentId)) return harness;
  }

  // Same parent, but nested nodes must not keep a stale top-level position.
  if (
    node.parentId === parentId &&
    (parentId === undefined || node.position === undefined)
  ) {
    return harness;
  }

  let changed = false;
  const nodes = harness.nodes.map((entry) => {
    if (entry.id !== nodeId) return entry;
    const next = withParent(entry, parentId);
    if (next !== entry) changed = true;
    return next;
  });

  return changed ? { ...harness, nodes } : harness;
}

/**
 * Persist or clear a node's top-level canvas position. No-ops when the node
 * is nested (position is top-level-only) or the value is unchanged.
 */
export function setNodePosition(
  harness: Harness,
  nodeId: NodeId,
  position: NodePosition | undefined,
): Harness {
  let changed = false;
  const nodes = harness.nodes.map((entry) => {
    if (entry.id !== nodeId) return entry;
    // Nested nodes never carry a top-level placement.
    if (entry.parentId !== undefined) {
      const cleared = stripPosition(entry);
      if (cleared !== entry) changed = true;
      return cleared;
    }
    if (position === undefined) {
      const cleared = stripPosition(entry);
      if (cleared !== entry) changed = true;
      return cleared;
    }
    if (entry.position?.x === position.x && entry.position?.y === position.y) {
      return entry;
    }
    changed = true;
    return { ...entry, position };
  });
  return changed ? { ...harness, nodes } : harness;
}
