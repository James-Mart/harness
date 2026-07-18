import type { ContainerNode, Harness, LeafNode, NodeId } from "@/model/types";

/** Non-blocking work-pool advisory cue kinds. */
export type WorkPoolAdvisoryCue = "missing-appender" | "missing-fixpoint";

/** Stable id for a derived fan-out append edge (canvas + delete). */
export function appendEdgeId(from: NodeId, to: NodeId): string {
  return `append:${from}->${to}`;
}

/** Body leaves that declare fan-out append into `containerId`. */
export function nodesAppendingTo(
  harness: Harness,
  containerId: NodeId,
): LeafNode[] {
  return harness.nodes.filter(
    (node): node is LeafNode =>
      node.kind === "leaf" && node.appendsTo === containerId,
  );
}

/** Live containers with no body node declaring `appendsTo` (advisory cue). */
export function liveContainersWithoutAppender(
  harness: Harness,
): ContainerNode[] {
  return harness.nodes.filter(
    (node): node is ContainerNode =>
      node.kind === "container" &&
      node.source.kind === "live" &&
      nodesAppendingTo(harness, node.id).length === 0,
  );
}

/** Live containers missing an explicit fixpoint end (advisory cue). */
export function workPoolsMissingFixpoint(harness: Harness): ContainerNode[] {
  return harness.nodes.filter(
    (node): node is ContainerNode =>
      node.kind === "container" &&
      node.source.kind === "live" &&
      node.end?.kind !== "fixpoint",
  );
}

/**
 * Precomputed advisory cues keyed by container id. Only containers with at
 * least one cue appear in the map.
 */
export function workPoolAdvisoryCues(
  harness: Harness,
): Map<NodeId, WorkPoolAdvisoryCue[]> {
  const withoutAppender = new Set(
    liveContainersWithoutAppender(harness).map((node) => node.id),
  );
  const missingFixpoint = new Set(
    workPoolsMissingFixpoint(harness).map((node) => node.id),
  );
  const cuesByContainer = new Map<NodeId, WorkPoolAdvisoryCue[]>();
  for (const id of new Set([...withoutAppender, ...missingFixpoint])) {
    const cues: WorkPoolAdvisoryCue[] = [];
    if (withoutAppender.has(id)) cues.push("missing-appender");
    if (missingFixpoint.has(id)) cues.push("missing-fixpoint");
    cuesByContainer.set(id, cues);
  }
  return cuesByContainer;
}

/** Advisory cues for one container (empty when none apply). */
export function advisoryCuesForContainer(
  harness: Harness,
  nodeId: NodeId,
): WorkPoolAdvisoryCue[] {
  return workPoolAdvisoryCues(harness).get(nodeId) ?? [];
}

/**
 * Hard work-pool invariants: fixpoint requires live source; `appendsTo`
 * must name an existing live container.
 */
export function assertWorkPoolInvariants(harness: Harness): void {
  for (const node of harness.nodes) {
    if (node.kind === "container") {
      if (node.source.kind === "snapshot" && node.end?.kind === "fixpoint") {
        throw new Error(
          `Container ${node.id}: fixpoint end requires a live source`,
        );
      }
      continue;
    }

    if (node.appendsTo === undefined) continue;

    const target = harness.nodes.find((item) => item.id === node.appendsTo);
    if (!target || target.kind !== "container") {
      throw new Error(
        `Leaf ${node.id}: appendsTo ${node.appendsTo} is not a container`,
      );
    }
    if (target.source.kind !== "live") {
      throw new Error(
        `Leaf ${node.id}: appendsTo ${target.id} is not a live source`,
      );
    }
  }
}
