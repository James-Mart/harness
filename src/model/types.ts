/** Opaque JSON Schema carried by a port (schema-owned; engine treats as opaque). */
export type JSONSchema = Record<string, unknown>;

export type NodeId = string;
export type PortId = string;

export interface Port {
  id: PortId;
  name: string;
  direction: "in" | "out";
  schema: JSONSchema;
  required?: boolean;
  iterable?: boolean;
}

export type Source = { kind: "snapshot" } | { kind: "live" };

export type Concurrency =
  { kind: "sequential" } | { kind: "parallel"; maxConcurrency?: number };

export interface LeafNode {
  kind: "leaf";
  id: NodeId;
  type: string;
  title: string;
  ports: Port[];
  parentId?: NodeId;
  isGate?: boolean;
}

export interface ContainerNode {
  kind: "container";
  id: NodeId;
  type: string;
  title: string;
  ports: Port[];
  parentId?: NodeId;
  iterablePortId: PortId;
  source: Source;
  concurrency: Concurrency;
}

export type Node = LeafNode | ContainerNode;

export type Edge =
  | {
      kind: "data";
      from: { node: NodeId; port: PortId };
      to: { node: NodeId; port: PortId };
    }
  | { kind: "exec"; from: NodeId; to: NodeId; branch?: string };

export interface RunConfig {
  perContainer: Record<NodeId, { maxConcurrency?: number }>;
  depthBound?: number;
  gates: Record<NodeId, { enabled: boolean }>;
}

export interface Harness {
  id: string;
  title: string;
  boundary: Port[];
  nodes: Node[];
  edges: Edge[];
  runConfig: RunConfig;
}

export const EMPTY_RUN_CONFIG: RunConfig = {
  perContainer: {},
  gates: {},
};

/** Built-in container output exposing the current iteration element. */
export const CURRENT_ITEM_PORT_ID = "$currentItem" as const;
