import type {
  Concurrency,
  ContainerNode,
  Harness,
  NodeId,
  RunConfig,
} from "@/model/types";

/**
 * Ephemeral ready-set for a live container source: items waiting,
 * currently executing, or finished. Simulation advances this; the
 * model layer owns append + fixpoint predicates.
 */
export type ReadySet = {
  ready: readonly string[];
  inFlight: readonly string[];
  done: readonly string[];
};

export function createReadySet(initialReady: readonly string[] = []): ReadySet {
  return {
    ready: [...initialReady],
    inFlight: [],
    done: [],
  };
}

/**
 * Append items to a live ready-set (recursive fan-out). Skips ids already
 * present in ready, in-flight, or done.
 */
export function appendToReadySet(
  pool: ReadySet,
  items: readonly string[],
): ReadySet {
  const known = new Set([...pool.ready, ...pool.inFlight, ...pool.done]);
  const added = items.filter((id) => !known.has(id));
  if (added.length === 0) return pool;
  return { ...pool, ready: [...pool.ready, ...added] };
}

/** Fixpoint: nothing ready and nothing in flight. */
export function isFixpoint(pool: ReadySet): boolean {
  return pool.ready.length === 0 && pool.inFlight.length === 0;
}

/**
 * Resolve the concurrency policy for a container: structural default
 * merged with `runConfig.perContainer` max override. Sequential stays
 * sequential (run-config cannot promote it to parallel).
 */
export function effectiveConcurrency(
  harness: Harness,
  container: ContainerNode,
): Concurrency {
  if (container.concurrency.kind === "sequential") {
    return { kind: "sequential" };
  }
  const override = harness.runConfig.perContainer[container.id]?.maxConcurrency;
  return {
    kind: "parallel",
    maxConcurrency: override ?? container.concurrency.maxConcurrency,
  };
}

/** Effective gate enablement: absent from `runConfig.gates` means enabled. */
export function isGateEnabled(runConfig: RunConfig, gateId: NodeId): boolean {
  return runConfig.gates[gateId] === undefined;
}

/** Effective max concurrent iterations for a concurrency policy. */
export function maxConcurrencyOf(concurrency: Concurrency): number {
  if (concurrency.kind === "sequential") return 1;
  return concurrency.maxConcurrency ?? Number.POSITIVE_INFINITY;
}

/** How many additional iterations may start under the policy. */
export function availableSlots(
  pool: ReadySet,
  concurrency: Concurrency,
): number {
  const max = maxConcurrencyOf(concurrency);
  if (!Number.isFinite(max)) {
    return pool.ready.length;
  }
  return Math.max(0, Math.min(pool.ready.length, max - pool.inFlight.length));
}

/** Slot math using harness run-config override resolution. */
export function availableSlotsFor(
  harness: Harness,
  container: ContainerNode,
  pool: ReadySet,
): number {
  return availableSlots(pool, effectiveConcurrency(harness, container));
}
