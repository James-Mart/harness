import type { Harness, NodeId } from "@/model";

/** Ids of every container node in `harness` (declaration order). */
export function containerIds(harness: Harness): NodeId[] {
  return harness.nodes
    .filter((node) => node.kind === "container")
    .map((node) => node.id);
}
