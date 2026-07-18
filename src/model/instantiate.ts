import {
  getCatalogEntry,
  type CatalogEntryFor,
  type CatalogPortDef,
  type CatalogType,
  type ContainerCatalogEntry,
} from "@/model/catalog";
import { itemSchemaOf, mockSchema } from "@/model/schema";
import {
  CURRENT_ITEM_PORT_ID,
  type Concurrency,
  type ContainerNode,
  type EndCondition,
  type LeafNode,
  type NodeId,
  type NodePosition,
  type Port,
  type Source,
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
  /** Persisted top-level placement (viewport-centre / drop authoring). */
  position?: NodePosition;
  /** Override catalog default source (containers). */
  source?: Source;
  /** Override catalog default concurrency (containers). */
  concurrency?: Concurrency;
  /** Override catalog default end condition (containers). */
  end?: EndCondition;
  /** Live container this leaf appends into (fan-out). */
  appendsTo?: NodeId;
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
      ...(options.position !== undefined ? { position: options.position } : {}),
      ...("isGate" in entry && entry.isGate ? { isGate: true } : {}),
      ...(options.appendsTo !== undefined
        ? { appendsTo: options.appendsTo }
        : {}),
    };
    return node as InstantiatedNode<T>;
  }

  const containerEntry = entry as ContainerCatalogEntry;
  const iterablePort = ports.find(
    (port) => port.id === containerEntry.iterablePortId,
  );
  if (!iterablePort?.iterable) {
    throw new Error(
      `Container catalog type ${type} iterable port ${containerEntry.iterablePortId} not found`,
    );
  }

  const source = options.source ?? containerEntry.defaultSource;
  const end = options.end ?? containerEntry.defaultEnd;
  if (end?.kind === "fixpoint" && source.kind !== "live") {
    throw new Error(
      `Container ${options.id}: fixpoint end requires a live source`,
    );
  }

  const node: ContainerNode = {
    kind: "container",
    id: options.id,
    type: containerEntry.type,
    title: options.title ?? containerEntry.title,
    ports: [...ports, currentItemPort(iterablePort)],
    ...(options.parentId !== undefined ? { parentId: options.parentId } : {}),
    ...(options.position !== undefined ? { position: options.position } : {}),
    iterablePortId: containerEntry.iterablePortId,
    source,
    concurrency: options.concurrency ?? containerEntry.defaultConcurrency,
    ...(end !== undefined ? { end } : {}),
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
