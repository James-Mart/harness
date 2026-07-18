import type { ContainerNode, Harness } from "@/model/types";

/** Container nodes in harness order. */
export function containersOf(harness: Harness): ContainerNode[] {
  return harness.nodes.filter(
    (node): node is ContainerNode => node.kind === "container",
  );
}
