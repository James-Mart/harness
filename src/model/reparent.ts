import { isAncestorOf } from "@/model/ancestry";
import type { Harness, Node, NodeId } from "@/model/types";

/** True when `nodeId` is `ancestorId` or nested under it. */
export function isUnder(
  harness: Harness,
  ancestorId: NodeId,
  nodeId: NodeId,
): boolean {
  const byId = new Map(harness.nodes.map((node) => [node.id, node]));
  return isAncestorOf((id) => byId.get(id)?.parentId, ancestorId, nodeId);
}

function withParent(node: Node, parentId: NodeId | undefined): Node {
  if (parentId === undefined) {
    if (node.parentId === undefined) return node;
    const rest = { ...node };
    delete rest.parentId;
    return rest;
  }
  if (node.parentId === parentId) return node;
  return { ...node, parentId };
}

/**
 * Set a node's container parent (`undefined` = top-level under the harness).
 * Rejects unknown ids, non-container parents, and cycles. No-ops return the
 * same harness reference.
 */
export function reparentNode(
  harness: Harness,
  nodeId: NodeId,
  parentId: NodeId | undefined,
): Harness {
  const node = harness.nodes.find((entry) => entry.id === nodeId);
  if (!node) return harness;

  if (node.parentId === parentId) return harness;

  if (parentId !== undefined) {
    const parent = harness.nodes.find((entry) => entry.id === parentId);
    if (!parent || parent.kind !== "container") return harness;
    // Parenting into self or a descendant would cycle the tree.
    if (isUnder(harness, nodeId, parentId)) return harness;
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
