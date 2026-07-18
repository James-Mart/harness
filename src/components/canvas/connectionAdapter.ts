import type { PortRef } from "@/model/types";

/** Minimal RF connection shape needed to resolve harness port refs. */
export type FlowConnectionLike = {
  source: string | null | undefined;
  target: string | null | undefined;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

/**
 * Map a React Flow connection (or edge-like object) to harness port refs.
 * Returns `null` when any endpoint is missing.
 */
export function connectionEndpoints(
  connection: FlowConnectionLike,
): { from: PortRef; to: PortRef } | null {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target || !sourceHandle || !targetHandle) {
    return null;
  }
  return {
    from: { node: source, port: sourceHandle },
    to: { node: target, port: targetHandle },
  };
}
