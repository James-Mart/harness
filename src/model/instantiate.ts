import {
  getCatalogEntry,
  type CatalogEntryFor,
  type CatalogPortDef,
  type CatalogType,
} from "@/model/catalog";
import { itemSchemaOf, mockSchema } from "@/model/schema";
import {
  CURRENT_ITEM_PORT_ID,
  type ContainerNode,
  type LeafNode,
  type NodeId,
  type Port,
} from "@/model/types";

function materializePorts(defs: readonly CatalogPortDef[]): Port[] {
  return defs.map((def) => ({
    id: def.id,
    name: def.name,
    direction: def.direction,
    schema: mockSchema(def.schema),
    ...(def.required !== undefined ? { required: def.required } : {}),
    ...(def.iterable !== undefined ? { iterable: def.iterable } : {}),
  }));
}

function currentItemPort(iterablePort: Port): Port {
  return {
    id: CURRENT_ITEM_PORT_ID,
    name: CURRENT_ITEM_PORT_ID,
    direction: "out",
    schema: itemSchemaOf(iterablePort.schema),
  };
}

export type InstantiateOptions = {
  id: NodeId;
  title?: string;
  parentId?: NodeId;
};

export type InstantiatedNode<T extends CatalogType> = {
  [K in T]: CatalogEntryFor<K>["kind"] extends "container"
    ? ContainerNode
    : LeafNode;
}[T];

/** Build a leaf or container node instance from a catalog type. */
export function instantiateFromCatalog<T extends CatalogType>(
  type: T,
  options: InstantiateOptions,
): InstantiatedNode<T> {
  const entry = getCatalogEntry(type);
  const ports = materializePorts(entry.ports);

  if (entry.kind === "leaf") {
    const node: LeafNode = {
      kind: "leaf",
      id: options.id,
      type: entry.type,
      title: options.title ?? entry.title,
      ports,
      ...(options.parentId !== undefined ? { parentId: options.parentId } : {}),
      ...("isGate" in entry && entry.isGate ? { isGate: true } : {}),
    };
    return node as InstantiatedNode<T>;
  }

  const iterablePort = ports.find((port) => port.id === entry.iterablePortId);
  if (!iterablePort?.iterable) {
    throw new Error(
      `Container catalog type ${type} iterable port ${entry.iterablePortId} not found`,
    );
  }

  const node: ContainerNode = {
    kind: "container",
    id: options.id,
    type: entry.type,
    title: options.title ?? entry.title,
    ports: [...ports, currentItemPort(iterablePort)],
    ...(options.parentId !== undefined ? { parentId: options.parentId } : {}),
    iterablePortId: entry.iterablePortId,
    source: entry.defaultSource,
    concurrency: entry.defaultConcurrency,
  };
  return node as InstantiatedNode<T>;
}

export function getCurrentItemPort(node: ContainerNode): Port {
  const port = node.ports.find((item) => item.id === CURRENT_ITEM_PORT_ID);
  if (!port) {
    throw new Error(
      `Container ${node.id} is missing built-in ${CURRENT_ITEM_PORT_ID} port`,
    );
  }
  return port;
}
