import type { Edge, Harness, Node, NodeId, Port } from "@/model/types";

/** Synthetic React Flow handle id for exec-in. */
export const EXEC_IN_HANDLE = "$exec" as const;

/** Synthetic React Flow handle id for an unbranched exec-out. */
export const EXEC_OUT_HANDLE = "$exec-out" as const;

export type ExecEdge = Extract<Edge, { kind: "exec" }>;

/** Stable id for an exec edge. */
export function execEdgeId(from: NodeId, to: NodeId, branch?: string): string {
  return branch === undefined
    ? `exec:${from}->${to}`
    : `exec:${from}->${to}:${branch}`;
}

/** Source handle id for an outgoing exec edge. */
export function execOutHandleId(branch?: string): string {
  return branch === undefined
    ? EXEC_OUT_HANDLE
    : `${EXEC_OUT_HANDLE}:${branch}`;
}

/** String enum members from a port schema, if any. */
function enumBranchValues(schema: Port["schema"]): string[] {
  if (!Array.isArray(schema.enum)) return [];
  return schema.enum.filter(
    (value): value is string => typeof value === "string",
  );
}

/** Deduped branch labels from out-port enum schemas (order preserved). */
export function branchValuesFromPorts(ports: readonly Port[]): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const port of ports) {
    if (port.direction !== "out") continue;
    for (const value of enumBranchValues(port.schema)) {
      if (seen.has(value)) continue;
      seen.add(value);
      values.push(value);
    }
  }
  return values;
}

/** Branch labels a node may select via typed output ports. */
export function branchValuesFromNode(node: Node): string[] {
  return branchValuesFromPorts(node.ports);
}

function execOutEdges(harness: Harness, from: NodeId): ExecEdge[] {
  return harness.edges.filter(
    (edge): edge is ExecEdge => edge.kind === "exec" && edge.from === from,
  );
}

/**
 * Exec-out slots to render for a node: prefer distinct `branch` values from
 * outgoing exec edges (graph is source of truth); if none, fall back to
 * enum-typed output ports; otherwise a single unbranched out.
 */
export function execOutBranchesForNode(
  harness: Harness,
  node: Node,
): (string | undefined)[] {
  const outs = execOutEdges(harness, node.id);
  if (outs.length > 0) {
    const seen = new Set<string>();
    const branches: (string | undefined)[] = [];
    for (const edge of outs) {
      const key = edge.branch ?? "";
      if (seen.has(key)) continue;
      seen.add(key);
      branches.push(edge.branch);
    }
    return branches;
  }

  const fromSchema = branchValuesFromPorts(node.ports);
  return fromSchema.length > 0 ? fromSchema : [undefined];
}

/**
 * Select the next node along an exec edge from `from`.
 *
 * - When `outputValue` is non-nullish, only a matching `branch` edge wins
 *   (fail-closed — no fallthrough to sequential).
 * - When `outputValue` is null/undefined, the unbranched sequential edge is used.
 */
export function selectExecPath(
  harness: Harness,
  from: NodeId,
  outputValue: unknown,
): NodeId | null {
  const outs = execOutEdges(harness, from);
  if (outs.length === 0) return null;

  if (outputValue !== undefined && outputValue !== null) {
    const key = String(outputValue);
    return outs.find((edge) => edge.branch === key)?.to ?? null;
  }

  return outs.find((edge) => edge.branch === undefined)?.to ?? null;
}
