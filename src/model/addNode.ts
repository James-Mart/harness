import type { CatalogType } from "@/model/catalog";
import { instantiateFromCatalog } from "@/model/instantiate";
import type { Harness, NodeId } from "@/model/types";

/** Allocate a unique node id from the catalog type and existing ids. */
function allocateNodeId(harness: Harness, type: CatalogType): NodeId {
  const existing = new Set(harness.nodes.map((node) => node.id));
  let n = 1;
  let id: NodeId = `${type}-${n}`;
  while (existing.has(id)) {
    n += 1;
    id = `${type}-${n}`;
  }
  return id;
}

/**
 * Instantiate a catalog type as a new top-level node and append it to the
 * harness. Nesting is a separate authoring step (geometric parenting).
 */
export function addCatalogNode(harness: Harness, type: CatalogType): Harness {
  const node = instantiateFromCatalog(type, {
    id: allocateNodeId(harness, type),
  });
  return { ...harness, nodes: [...harness.nodes, node] };
}
