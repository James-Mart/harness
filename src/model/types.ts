/** Opaque JSON Schema carried by a port (schema-owned; engine treats as opaque). */
export type JSONSchema = Record<string, unknown>;

export type NodeId = string;
export type PortId = string;

/** Endpoint of a data wire (node id + port id). */
export type PortRef = { node: NodeId; port: PortId };

/** Persisted canvas position for a top-level node (authoring placement). */
export type NodePosition = { x: number; y: number };

export interface Port {
  id: PortId;
  name: string;
  direction: "in" | "out";
  schema: JSONSchema;
  required?: boolean;
  iterable?: boolean;
}

/** Iterable source liveness: fixed list vs re-pulled ready-set. */
export type Source = { kind: "snapshot" } | { kind: "live" };

/** Per-container iteration scheduling policy. */
export type Concurrency =
  { kind: "sequential" } | { kind: "parallel"; maxConcurrency?: number };

/**
 * How a container decides it is done. Live work-pools use fixpoint
 * (no item ready, none in flight). Snapshot containers omit this and
 * end when their fixed list is exhausted.
 */
export type EndCondition = { kind: "fixpoint" };

export interface LeafNode {
  kind: "leaf";
  id: NodeId;
  type: string;
  title: string;
  ports: Port[];
  parentId?: NodeId;
  /** Persisted top-level placement; honored only while `parentId` is unset. */
  position?: NodePosition;
  isGate?: boolean;
  /**
   * Container whose live source this body node may append to
   * (recursive fan-out). Domain side effect — not a data wire.
   */
  appendsTo?: NodeId;
}

export interface ContainerNode {
  kind: "container";
  id: NodeId;
  type: string;
  title: string;
  ports: Port[];
  parentId?: NodeId;
  /** Persisted top-level placement; honored only while `parentId` is unset. */
  position?: NodePosition;
  iterablePortId: PortId;
  source: Source;
  concurrency: Concurrency;
  /** Present on live work-pools; fixpoint end condition. */
  end?: EndCondition;
}

export type Node = LeafNode | ContainerNode;

export type Edge =
  | {
      kind: "data";
      from: PortRef;
      to: PortRef;
    }
  | { kind: "exec"; from: NodeId; to: NodeId; branch?: string };

export interface RunConfig {
  perContainer: Record<NodeId, { maxConcurrency?: number }>;
  depthBound?: number;
  /** Disabled gates only; absence means enabled. */
  gates: Record<NodeId, { enabled: false }>;
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
