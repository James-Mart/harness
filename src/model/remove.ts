import { execEdgeId } from "@/model/exec";
import { appendEdgeId } from "@/model/workpoolGraph";
import type { Harness, Node, NodeId } from "@/model/types";
import { dataEdgeId } from "@/model/wiring";

/** Clear a leaf's `appendsTo` when present; otherwise return the node as-is. */
function stripAppendsTo(node: Node): Node {
  if (node.kind !== "leaf" || node.appendsTo === undefined) return node;
  const rest = { ...node };
  delete rest.appendsTo;
  return rest;
}

/**
 * Node ids to remove: each requested id plus every descendant.
 * Builds a children index once, then BFS from the roots — O(nodes).
 */
function collectRemovalSet(
  harness: Harness,
  nodeIds: readonly NodeId[],
): Set<NodeId> {
  const children = new Map<NodeId, NodeId[]>();
  const known = new Set<NodeId>();
  for (const node of harness.nodes) {
    known.add(node.id);
    if (node.parentId === undefined) continue;
    const siblings = children.get(node.parentId);
    if (siblings) siblings.push(node.id);
    else children.set(node.parentId, [node.id]);
  }

  const remove = new Set<NodeId>();
  const stack = nodeIds.filter((id) => known.has(id));
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (remove.has(id)) continue;
    remove.add(id);
    const kids = children.get(id);
    if (kids) stack.push(...kids);
  }
  return remove;
}

function pruneRunConfig(
  harness: Harness,
  remove: ReadonlySet<NodeId>,
): Harness["runConfig"] {
  if (remove.size === 0) return harness.runConfig;

  let perChanged = false;
  let gatesChanged = false;
  const perContainer = { ...harness.runConfig.perContainer };
  const gates = { ...harness.runConfig.gates };
  for (const id of remove) {
    if (id in perContainer) {
      delete perContainer[id];
      perChanged = true;
    }
    if (id in gates) {
      delete gates[id];
      gatesChanged = true;
    }
  }
  if (!perChanged && !gatesChanged) return harness.runConfig;
  return {
    ...harness.runConfig,
    ...(perChanged ? { perContainer } : {}),
    ...(gatesChanged ? { gates } : {}),
  };
}

/**
 * Remove nodes and their descendants, stripping incident edges and clearing
 * `appendsTo` / run-config entries that referenced them.
 */
export function removeNodes(
  harness: Harness,
  nodeIds: readonly NodeId[],
): Harness {
  if (nodeIds.length === 0) return harness;

  const remove = collectRemovalSet(harness, nodeIds);
  if (remove.size === 0) return harness;

  const nodes = harness.nodes
    .filter((node) => !remove.has(node.id))
    .map((node) =>
      node.kind === "leaf" &&
      node.appendsTo !== undefined &&
      remove.has(node.appendsTo)
        ? stripAppendsTo(node)
        : node,
    );

  const edges = harness.edges.filter((edge) => {
    if (edge.kind === "data") {
      return !remove.has(edge.from.node) && !remove.has(edge.to.node);
    }
    return !remove.has(edge.from) && !remove.has(edge.to);
  });

  return {
    ...harness,
    nodes,
    edges,
    runConfig: pruneRunConfig(harness, remove),
  };
}

/** Clear a leaf's `appendsTo` (authoring delete of a derived append edge). */
function clearAppendEdge(harness: Harness, edgeId: string): Harness | null {
  for (const node of harness.nodes) {
    if (node.kind !== "leaf" || node.appendsTo === undefined) continue;
    if (appendEdgeId(node.id, node.appendsTo) !== edgeId) continue;
    return {
      ...harness,
      nodes: harness.nodes.map((entry) =>
        entry.id === node.id ? stripAppendsTo(entry) : entry,
      ),
    };
  }
  return null;
}

/**
 * Remove data/exec edges by stable flow id, or clear `appendsTo` for an
 * append-edge id. Unknown ids are ignored.
 */
export function removeEdges(
  harness: Harness,
  edgeIds: readonly string[],
): Harness {
  if (edgeIds.length === 0) return harness;

  const remove = new Set(edgeIds);
  let next: Harness = harness;

  for (const edgeId of remove) {
    if (!edgeId.startsWith("append:")) continue;
    const cleared = clearAppendEdge(next, edgeId);
    if (cleared) next = cleared;
  }

  const edges = next.edges.filter((edge) => {
    if (edge.kind === "data") {
      return !remove.has(dataEdgeId(edge.from, edge.to));
    }
    return !remove.has(execEdgeId(edge.from, edge.to, edge.branch));
  });

  if (edges.length === next.edges.length && next === harness) return harness;
  return { ...next, edges };
}

/** Delete a mixed selection of model nodes and flow edges in one step. */
export function deleteSelection(
  harness: Harness,
  selection: {
    nodeIds?: readonly NodeId[];
    edgeIds?: readonly string[];
  },
): Harness {
  let next = removeNodes(harness, selection.nodeIds ?? []);
  next = removeEdges(next, selection.edgeIds ?? []);
  return next;
}
