import type { CatalogType } from "@/model/catalog";
import { instantiateFromCatalog } from "@/model/instantiate";
import type { Harness, NodeId, NodePosition } from "@/model/types";

/** Authoring options when instantiating a catalog node. */
export type AddCatalogNodeOptions = {
  /** Persist a canvas position (viewport-centre / drop placement). */
  position?: NodePosition;
};

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
 * harness. An optional `position` persists a canvas placement so the node
 * appears where the user dropped / where the viewport is centred, rather than
 * only at the auto-layout slot. Nesting is a separate authoring step
 * (geometric parenting).
 */
export function addCatalogNode(
  harness: Harness,
  type: CatalogType,
  options: AddCatalogNodeOptions = {},
): Harness {
  const node = instantiateFromCatalog(type, {
    id: allocateNodeId(harness, type),
    ...(options.position !== undefined ? { position: options.position } : {}),
  });
  return { ...harness, nodes: [...harness.nodes, node] };
}
