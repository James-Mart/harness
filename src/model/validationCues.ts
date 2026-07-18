import type { Harness, NodeId, PortRef } from "@/model/types";

/** Non-blocking wiring advisory cue kinds (general, not work-pool-specific). */
export type WiringAdvisoryCue = "unwired-required" | "multi-wire-input";

function inputKey(node: NodeId, port: string): string {
  return `${node}/${port}`;
}

/** Count of data wires into each input port. */
function dataWireCounts(harness: Harness): Map<string, number> {
  const counts = new Map<string, number>();
  for (const edge of harness.edges) {
    if (edge.kind !== "data") continue;
    const key = inputKey(edge.to.node, edge.to.port);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Single pass over node input ports: required-unwired and multi-wire hits.
 * Multi-wire only counts ports that exist as inputs on the target node.
 */
function collectWiringIssues(harness: Harness): {
  unwired: PortRef[];
  multi: PortRef[];
} {
  const counts = dataWireCounts(harness);
  const unwired: PortRef[] = [];
  const multi: PortRef[] = [];
  for (const node of harness.nodes) {
    for (const port of node.ports) {
      if (port.direction !== "in") continue;
      const count = counts.get(inputKey(node.id, port.id)) ?? 0;
      const ref = { node: node.id, port: port.id };
      if (port.required === true && count === 0) unwired.push(ref);
      if (count >= 2) multi.push(ref);
    }
  }
  return { unwired, multi };
}

/** Required input ports with no incoming data wire. */
export function unwiredRequiredInputs(harness: Harness): PortRef[] {
  return collectWiringIssues(harness).unwired;
}

/** Input ports with more than one incoming data wire (one-wire-per-input). */
export function multiWireInputs(harness: Harness): PortRef[] {
  return collectWiringIssues(harness).multi;
}

/**
 * Precomputed wiring advisory cues keyed by node id. Only nodes with at
 * least one cue appear in the map.
 */
export function wiringAdvisoryCues(
  harness: Harness,
): Map<NodeId, WiringAdvisoryCue[]> {
  const { unwired, multi } = collectWiringIssues(harness);
  const unwiredNodes = new Set(unwired.map((ref) => ref.node));
  const multiNodes = new Set(multi.map((ref) => ref.node));

  const cuesByNode = new Map<NodeId, WiringAdvisoryCue[]>();
  for (const id of new Set([...unwiredNodes, ...multiNodes])) {
    const cues: WiringAdvisoryCue[] = [];
    if (unwiredNodes.has(id)) cues.push("unwired-required");
    if (multiNodes.has(id)) cues.push("multi-wire-input");
    cuesByNode.set(id, cues);
  }
  return cuesByNode;
}

/** Wiring advisory cues for one node (empty when none apply). */
export function advisoryCuesForNode(
  harness: Harness,
  nodeId: NodeId,
): WiringAdvisoryCue[] {
  return wiringAdvisoryCues(harness).get(nodeId) ?? [];
}
