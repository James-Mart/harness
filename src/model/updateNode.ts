import type {
  Concurrency,
  ContainerNode,
  EndCondition,
  Harness,
  LeafNode,
  Node,
  NodeId,
  Source,
} from "@/model/types";

/**
 * Structural edits the inspector can apply to a node. `title` applies to any
 * node; the rest are kind-specific and are ignored when they do not apply.
 * Concurrency kind / max are split so the view does not assemble Concurrency.
 */
export type NodeUpdate =
  | { field: "title"; value: string }
  | { field: "source"; value: Source }
  | { field: "concurrencyKind"; value: "sequential" | "parallel" }
  | { field: "maxConcurrency"; value: string }
  | { field: "end"; value: EndCondition | undefined }
  | { field: "appendsTo"; value: NodeId | undefined };

function isContainer(node: Node): node is ContainerNode {
  return node.kind === "container";
}

function isLeaf(node: Node): node is LeafNode {
  return node.kind === "leaf";
}

/** Fixpoint end requires a live source; drop `end` when it no longer holds. */
function normalizeContainerEnd(node: ContainerNode): ContainerNode {
  if (node.end?.kind === "fixpoint" && node.source.kind !== "live") {
    const rest = { ...node };
    delete rest.end;
    return rest;
  }
  return node;
}

/** Parse a max-concurrency text field: empty → undefined; else floor ≥ 1. */
export function parseMaxConcurrencyInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.floor(parsed);
}

function withConcurrencyKind(
  current: Concurrency,
  kind: "sequential" | "parallel",
): Concurrency {
  if (kind === "sequential") return { kind: "sequential" };
  return {
    kind: "parallel",
    ...(current.kind === "parallel" && current.maxConcurrency !== undefined
      ? { maxConcurrency: current.maxConcurrency }
      : {}),
  };
}

function applyUpdate(node: Node, update: NodeUpdate): Node {
  switch (update.field) {
    case "title":
      return node.title === update.value
        ? node
        : { ...node, title: update.value };

    case "source":
      if (!isContainer(node)) return node;
      return normalizeContainerEnd({ ...node, source: update.value });

    case "concurrencyKind": {
      if (!isContainer(node)) return node;
      const concurrency = withConcurrencyKind(node.concurrency, update.value);
      if (
        concurrency.kind === node.concurrency.kind &&
        (concurrency.kind === "sequential" ||
          concurrency.maxConcurrency ===
            (node.concurrency.kind === "parallel"
              ? node.concurrency.maxConcurrency
              : undefined))
      ) {
        return node;
      }
      return { ...node, concurrency };
    }

    case "maxConcurrency": {
      if (!isContainer(node) || node.concurrency.kind !== "parallel") {
        return node;
      }
      const maxConcurrency = parseMaxConcurrencyInput(update.value);
      if (maxConcurrency === node.concurrency.maxConcurrency) return node;
      return {
        ...node,
        concurrency: {
          kind: "parallel",
          ...(maxConcurrency !== undefined ? { maxConcurrency } : {}),
        },
      };
    }

    case "end": {
      if (!isContainer(node)) return node;
      if (update.value === undefined) {
        if (node.end === undefined) return node;
        const rest = { ...node };
        delete rest.end;
        return rest;
      }
      // Fixpoint is only coherent on a live source; ignore otherwise.
      if (node.source.kind !== "live") return node;
      return { ...node, end: update.value };
    }

    case "appendsTo": {
      if (!isLeaf(node)) return node;
      if (update.value === undefined) {
        if (node.appendsTo === undefined) return node;
        const rest = { ...node };
        delete rest.appendsTo;
        return rest;
      }
      return { ...node, appendsTo: update.value };
    }
  }
}

/**
 * Apply a single structural edit to `nodeId`. Enforces model invariants
 * (e.g. fixpoint end requires a live source) and returns the same harness
 * reference when nothing changes.
 */
export function updateNode(
  harness: Harness,
  nodeId: NodeId,
  update: NodeUpdate,
): Harness {
  let changed = false;
  const nodes = harness.nodes.map((node) => {
    if (node.id !== nodeId) return node;
    const next = applyUpdate(node, update);
    if (next !== node) changed = true;
    return next;
  });
  return changed ? { ...harness, nodes } : harness;
}
