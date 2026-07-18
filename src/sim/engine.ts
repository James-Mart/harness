import {
  admitHead,
  appendToReadySet,
  availableSlotsFor,
  completeItem,
  createReadySet,
  isFixpoint,
  type ReadySet,
} from "@/model/readySet";
import type { ContainerNode, Harness, NodeId } from "@/model/types";
import { randomTransitionMs, type RngState } from "@/sim/rng";
import type { SimItem, SimScript, SimSpawn } from "@/sim/types";

/** In-flight cursor: one highlight per active item on the body template. */
export type SimCursor = {
  itemId: string;
  containerId: NodeId;
  /** Index into `SimItem.path` the item currently occupies. */
  pathIndex: number;
  /** Transition started by the current Step; absent when settled at a node. */
  pending?: {
    /** Next path index, or `path.length` meaning completion. */
    toPathIndex: number;
    landsAtMs: number;
    durationMs: number;
  };
};

export type RunStatus = "idle" | "running" | "fixpoint";

export type RunState = {
  harness: Harness;
  script: SimScript;
  pools: Record<NodeId, ReadySet>;
  /** Cursors keyed by item id (in-flight only). */
  cursors: Record<string, SimCursor>;
  nowMs: number;
  speed: number;
  status: RunStatus;
  /** Serializable mulberry32 counter for transition durations. */
  rngState: RngState;
};

export type CreateRunStateOptions = {
  harness: Harness;
  script: SimScript;
  /** Seed for reproducible transition durations. */
  seed?: number;
  /** Multiplier on 1–5s durations (>1 faster). */
  speed?: number;
};

function containersOf(harness: Harness): ContainerNode[] {
  return harness.nodes.filter(
    (node): node is ContainerNode => node.kind === "container",
  );
}

function requireItem(script: SimScript, id: string): SimItem {
  const item = script.items[id];
  if (!item) {
    throw new Error(`SimScript missing item "${id}"`);
  }
  return item;
}

function emptyPools(harness: Harness): Record<NodeId, ReadySet> {
  const pools: Record<NodeId, ReadySet> = {};
  for (const container of containersOf(harness)) {
    pools[container.id] = createReadySet();
  }
  return pools;
}

function poolFor(state: RunState, containerId: NodeId): ReadySet {
  const pool = state.pools[containerId];
  if (!pool) {
    throw new Error(`No pool for container "${containerId}"`);
  }
  return pool;
}

function setPool(
  state: RunState,
  containerId: NodeId,
  pool: ReadySet,
): RunState {
  return {
    ...state,
    pools: { ...state.pools, [containerId]: pool },
  };
}

/** True when no cursor has a pending transition. */
export function isSettled(state: RunState): boolean {
  return Object.values(state.cursors).every((cursor) => cursor.pending == null);
}

/** All container pools at fixpoint (nothing ready, nothing in flight). */
export function isRunFixpoint(state: RunState): boolean {
  return containersOf(state.harness).every((container) =>
    isFixpoint(poolFor(state, container.id)),
  );
}

function refreshStatus(state: RunState): RunState {
  if (!isSettled(state)) {
    return { ...state, status: "running" };
  }
  if (isRunFixpoint(state)) {
    return { ...state, status: "fixpoint" };
  }
  return {
    ...state,
    status: Object.keys(state.cursors).length > 0 ? "running" : "idle",
  };
}

/**
 * Create a run: place script roots into their containers' ready sets.
 * No items are in flight until the first `step`.
 */
export function createRunState(options: CreateRunStateOptions): RunState {
  const { harness, script, seed = 1, speed = 1 } = options;
  let pools = emptyPools(harness);

  for (const rootId of script.roots) {
    const item = requireItem(script, rootId);
    if (!pools[item.containerId]) {
      pools[item.containerId] = createReadySet();
    }
    pools = {
      ...pools,
      [item.containerId]: appendToReadySet(pools[item.containerId]!, [rootId]),
    };
  }

  return refreshStatus({
    harness,
    script,
    pools,
    cursors: {},
    nowMs: 0,
    speed,
    status: "idle",
    rngState: seed >>> 0,
  });
}

/**
 * Admit ready items into in-flight up to concurrency.
 * Spawns that land during a step stay in `ready` until the *next* `step`
 * (single pass; no mid-step re-admit of newly appended items).
 */
function fillSlots(state: RunState): RunState {
  let next = state;
  for (const container of containersOf(state.harness)) {
    let pool = poolFor(next, container.id);
    let slots = availableSlotsFor(next.harness, container, pool);
    const cursors = { ...next.cursors };

    while (slots > 0) {
      const admitted = admitHead(pool);
      if (!admitted) break;
      pool = admitted.pool;
      // Empty paths still get a cursor; the first step completes them via
      // the normal pending → landCursor path (same as non-empty items).
      cursors[admitted.itemId] = {
        itemId: admitted.itemId,
        containerId: container.id,
        pathIndex: 0,
      };
      slots -= 1;
    }

    next = { ...next, cursors, pools: { ...next.pools, [container.id]: pool } };
  }
  return next;
}

/**
 * Spawns fire when finishing a node: `atNode` matches the node being left, or
 * `atNode` is omitted and the item is completing its path.
 */
function matchingSpawns(
  item: SimItem,
  leavingNode: NodeId | undefined,
  completing: boolean,
): SimSpawn[] {
  if (!item.spawns?.length) return [];
  return item.spawns.filter((spawn) => {
    if (spawn.atNode === undefined) return completing;
    return leavingNode !== undefined && spawn.atNode === leavingNode;
  });
}

function applySpawns(
  state: RunState,
  item: SimItem,
  leavingNode: NodeId | undefined,
  completing: boolean,
): RunState {
  const spawns = matchingSpawns(item, leavingNode, completing);
  if (spawns.length === 0) return state;

  let next = state;
  for (const spawn of spawns) {
    for (const id of spawn.items) {
      requireItem(next.script, id);
    }
    if (!next.pools[spawn.containerId]) {
      next = setPool(next, spawn.containerId, createReadySet());
    }
    next = setPool(
      next,
      spawn.containerId,
      appendToReadySet(poolFor(next, spawn.containerId), spawn.items),
    );
  }
  return next;
}

function landCursor(state: RunState, cursor: SimCursor): RunState {
  const item = requireItem(state.script, cursor.itemId);
  const toPathIndex = cursor.pending?.toPathIndex;
  if (toPathIndex === undefined) return state;

  const leavingNode = item.path[cursor.pathIndex]?.node;
  const completing = toPathIndex >= item.path.length;

  if (completing) {
    const pool = completeItem(
      poolFor(state, cursor.containerId),
      cursor.itemId,
    );
    const cursors = { ...state.cursors };
    delete cursors[cursor.itemId];
    let next: RunState = {
      ...state,
      cursors,
      pools: { ...state.pools, [cursor.containerId]: pool },
    };
    next = applySpawns(next, item, leavingNode, true);
    return next;
  }

  const updated: SimCursor = {
    itemId: cursor.itemId,
    containerId: cursor.containerId,
    pathIndex: toPathIndex,
  };
  let next: RunState = {
    ...state,
    cursors: { ...state.cursors, [cursor.itemId]: updated },
  };
  next = applySpawns(next, item, leavingNode, false);
  return next;
}

/**
 * Begin one Step round: fill concurrency slots, then start a transition on
 * every in-flight cursor toward its next path node (or completion). Each
 * transition gets a seedable random 1–5s duration (scaled by `speed`).
 *
 * Throws if a previous step still has pending transitions.
 */
export function step(state: RunState): RunState {
  if (!isSettled(state)) {
    throw new Error("Cannot step while transitions are pending");
  }
  if (isRunFixpoint(state)) {
    return refreshStatus(state);
  }

  const filled = fillSlots(state);
  const cursors: Record<string, SimCursor> = { ...filled.cursors };
  let rngState = filled.rngState;

  // Stable draw order for reproducible runs across object-key insertion quirks.
  for (const itemId of Object.keys(cursors).sort()) {
    const cursor = cursors[itemId]!;
    const drawn = randomTransitionMs(rngState, filled.speed);
    rngState = drawn.state;
    cursors[itemId] = {
      ...cursor,
      pending: {
        toPathIndex: cursor.pathIndex + 1,
        durationMs: drawn.ms,
        landsAtMs: filled.nowMs + drawn.ms,
      },
    };
  }

  return refreshStatus({ ...filled, cursors, rngState });
}

/**
 * Advance the simulation clock to `nowMs` and land every transition whose
 * `landsAtMs` is <= now, in chronological order (staggered completions).
 */
export function advanceTime(state: RunState, nowMs: number): RunState {
  if (nowMs < state.nowMs) {
    throw new Error("advanceTime cannot move backwards");
  }

  let next: RunState = { ...state, nowMs };
  for (;;) {
    const pending = Object.values(next.cursors)
      .filter(
        (
          cursor,
        ): cursor is SimCursor & {
          pending: NonNullable<SimCursor["pending"]>;
        } => cursor.pending != null && cursor.pending.landsAtMs <= nowMs,
      )
      .sort((a, b) => {
        const dt = a.pending.landsAtMs - b.pending.landsAtMs;
        if (dt !== 0) return dt;
        return a.itemId.localeCompare(b.itemId);
      });

    if (pending.length === 0) break;
    next = landCursor(next, pending[0]!);
  }

  return refreshStatus(next);
}

/** Advance clock to the next pending landing (no-op if settled). */
export function settleNext(state: RunState): RunState {
  const lands = Object.values(state.cursors)
    .map((cursor) => cursor.pending?.landsAtMs)
    .filter((t): t is number => t != null);
  if (lands.length === 0) return state;
  return advanceTime(state, Math.min(...lands));
}

/** Land all pending transitions in time order until settled. */
export function settleAll(state: RunState): RunState {
  let next = state;
  while (!isSettled(next)) {
    next = settleNext(next);
  }
  return next;
}

/** Snapshot of pending transition durations (for tests / overlay). */
export function pendingDurations(state: RunState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, cursor] of Object.entries(state.cursors)) {
    if (cursor.pending) out[id] = cursor.pending.durationMs;
  }
  return out;
}
