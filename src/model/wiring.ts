import { schemasCompatible } from "@/model/schema";
import type { Edge, Harness, Port, PortRef } from "@/model/types";

export function findPort(harness: Harness, ref: PortRef): Port | undefined {
  const node = harness.nodes.find((item) => item.id === ref.node);
  return node?.ports.find((port) => port.id === ref.port);
}

export function dataEdgeId(from: PortRef, to: PortRef): string {
  return `data:${from.node}/${from.port}->${to.node}/${to.port}`;
}

/** Whether a data wire from `from` to `to` is allowed (direction + types). */
export function canConnectDataWire(
  harness: Harness,
  from: PortRef,
  to: PortRef,
): boolean {
  const fromPort = findPort(harness, from);
  const toPort = findPort(harness, to);
  if (!fromPort || !toPort) return false;
  if (fromPort.direction !== "out" || toPort.direction !== "in") return false;
  if (from.node === to.node && from.port === to.port) return false;
  return schemasCompatible(fromPort.schema, toPort.schema);
}

/**
 * Add a data wire, replacing any existing wire into the same input
 * (one-wire-per-input). Returns `null` when the connection is illegal.
 */
export function connectDataWire(
  harness: Harness,
  from: PortRef,
  to: PortRef,
): Harness | null {
  if (!canConnectDataWire(harness, from, to)) {
    return null;
  }

  const nextEdge: Edge = { kind: "data", from, to };
  const edges = harness.edges.filter(
    (edge) =>
      !(
        edge.kind === "data" &&
        edge.to.node === to.node &&
        edge.to.port === to.port
      ),
  );
  edges.push(nextEdge);

  return { ...harness, edges };
}
