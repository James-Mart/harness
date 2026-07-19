import {
  harnessRootFlowNodes,
  type FlowGeometryNode,
} from "@/authoring/flowGeometry";
import { setNodePositions, type Harness, type NodeId, type NodePosition } from "@/model";

/**
 * Freeze every harness-root at its current flow-space position so
 * `harnessToFlowNodes` does not re-pack non-dragged siblings from
 * `x = containerPadX`.
 *
 * `topLevelId` is always written (even when draft geometry still nests it —
 * un-nest mid-drag), using that entry's flow `position`.
 */
export function persistHarnessRootLayout(
  harness: Harness,
  geometry: readonly FlowGeometryNode[],
  topLevelId: NodeId,
): Harness {
  const positions = new Map<NodeId, NodePosition>();
  for (const entry of harnessRootFlowNodes(geometry)) {
    positions.set(entry.id, entry.position);
  }
  const committed = geometry.find((entry) => entry.id === topLevelId);
  if (committed) {
    positions.set(topLevelId, committed.position);
  }
  return setNodePositions(harness, positions);
}
