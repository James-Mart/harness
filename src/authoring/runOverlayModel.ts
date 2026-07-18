import type { FlowGeometryNode, FlowRect } from "@/authoring/flowGeometry";
import { flowNodeRects } from "@/authoring/flowGeometry";
import { containersOf } from "@/model/containers";
import { isFixpoint, type NodeId } from "@/model";
import { cursorTransitionProgress, type RunState, type SimCursor } from "@/sim";

export type OverlayRect = FlowRect;
export { flowNodeRects };

/** Horizontal lane gap between concurrent cursors sharing one node. */
export const CURSOR_LANE_GAP = 26;

/** Phase of an in-flight cursor's current transition. */
export type CursorPhase = "settled" | "moving" | "completing";

/** One rendered cursor highlight on the body template (flow coordinates). */
export type CursorToken = {
  itemId: string;
  label: string;
  containerId: NodeId;
  /** Token center X in flow coordinates. */
  x: number;
  /** Token center Y in flow coordinates. */
  y: number;
  phase: CursorPhase;
  /** Transition progress 0→1 (1 when settled). */
  progress: number;
  opacity: number;
};

/** Per-container work-pool ledger row (ready / in-flight / done counts). */
export type ContainerLedgerRow = {
  containerId: NodeId;
  title: string;
  ready: number;
  inFlight: number;
  done: number;
  fixpoint: boolean;
};

export type RunOverlayProjection = {
  rects: Map<string, OverlayRect>;
  tokens: CursorToken[];
  ledger: ContainerLedgerRow[];
  doneIds: NodeId[];
};

function centerOf(rect: OverlayRect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function bottomCenterOf(rect: OverlayRect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Screen tokens for every in-flight cursor. Cursors sharing a container are
 * spread into horizontal lanes (stable by item id) so concurrent iterations
 * on the single body template stay visually distinct.
 */
export function cursorTokens(
  state: RunState,
  rects: Map<string, OverlayRect>,
): CursorToken[] {
  const byContainer = new Map<NodeId, SimCursor[]>();
  for (const cursor of Object.values(state.cursors)) {
    const bucket = byContainer.get(cursor.containerId);
    if (bucket) bucket.push(cursor);
    else byContainer.set(cursor.containerId, [cursor]);
  }

  const tokens: CursorToken[] = [];
  for (const [containerId, cursors] of byContainer) {
    const containerRect = rects.get(containerId);
    const lane = [...cursors].sort((a, b) => a.itemId.localeCompare(b.itemId));
    lane.forEach((cursor, index) => {
      const token = tokenFor(state, cursor, rects, containerRect);
      if (!token) return;
      token.x += laneOffset(index, lane.length);
      tokens.push(token);
    });
  }
  return tokens.sort((a, b) => a.itemId.localeCompare(b.itemId));
}

function laneOffset(index: number, count: number): number {
  return (index - (count - 1) / 2) * CURSOR_LANE_GAP;
}

function tokenFor(
  state: RunState,
  cursor: SimCursor,
  rects: Map<string, OverlayRect>,
  containerRect: OverlayRect | undefined,
): CursorToken | null {
  const item = state.script.items[cursor.itemId];
  if (!item) return null;

  const fromNode = item.path[cursor.pathIndex]?.node;
  const fromRect = (fromNode && rects.get(fromNode)) || containerRect;
  if (!fromRect) return null;
  const from = centerOf(fromRect);

  const base = {
    itemId: cursor.itemId,
    label: item.label,
    containerId: cursor.containerId,
  };

  if (!cursor.pending) {
    return {
      ...base,
      x: from.x,
      y: from.y,
      phase: "settled",
      progress: 1,
      opacity: 1,
    };
  }

  const progress = cursorTransitionProgress(cursor.pending, state.nowMs);
  const completing = cursor.pending.toPathIndex >= item.path.length;

  if (completing) {
    const exit = containerRect ? bottomCenterOf(containerRect) : from;
    return {
      ...base,
      x: lerp(from.x, exit.x, progress),
      y: lerp(from.y, exit.y, progress),
      phase: "completing",
      progress,
      opacity: 1 - 0.8 * progress,
    };
  }

  const toNode = item.path[cursor.pending.toPathIndex]?.node;
  const toRect = (toNode && rects.get(toNode)) || containerRect || fromRect;
  const to = centerOf(toRect);
  return {
    ...base,
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
    phase: "moving",
    progress,
    opacity: 1,
  };
}

/** Work-pool ledger rows for every container that has a live pool. */
export function containerLedger(state: RunState): ContainerLedgerRow[] {
  const rows: ContainerLedgerRow[] = [];
  for (const container of containersOf(state.harness)) {
    const pool = state.pools[container.id];
    if (!pool) continue;
    rows.push({
      containerId: container.id,
      title: container.title,
      ready: pool.ready.length,
      inFlight: pool.inFlight.length,
      done: pool.done.length,
      fixpoint: isFixpoint(pool),
    });
  }
  return rows;
}

/**
 * Containers whose work has completed (fixpoint reached after processing at
 * least one item) — used to dim their body as a "done" branch.
 */
export function doneContainerIds(state: RunState): NodeId[] {
  return containerLedger(state)
    .filter((row) => row.fixpoint && row.done > 0)
    .map((row) => row.containerId);
}

/**
 * Single-pass overlay projection: rects once, ledger once, done ids derived
 * from ledger rows (no second harness/pool scan).
 */
export function projectRunOverlay(
  state: RunState,
  nodes: readonly FlowGeometryNode[],
): RunOverlayProjection {
  const rects = flowNodeRects(nodes);
  const ledger = containerLedger(state);
  return {
    rects,
    tokens: cursorTokens(state, rects),
    ledger,
    doneIds: ledger
      .filter((row) => row.fixpoint && row.done > 0)
      .map((row) => row.containerId),
  };
}
