import { instantiateFromCatalog } from "@/model/instantiate";
import { mockSchema } from "@/model/schema";
import {
  CURRENT_ITEM_PORT_ID,
  EMPTY_RUN_CONFIG,
  type Harness,
  type Port,
} from "@/model/types";
import { assertWorkPoolInvariants } from "@/model/workpoolGraph";

/** Typed outer signature for the base seed (harness-as-node). */
function baseSeedBoundary(): Port[] {
  return [
    {
      id: "tasks",
      name: "tasks",
      direction: "in",
      schema: mockSchema("taskList"),
      required: true,
    },
    {
      id: "summary",
      name: "summary",
      direction: "out",
      schema: mockSchema("string"),
    },
  ];
}

/**
 * Minimal base harness: list source → snapshot ForEach → implementor,
 * with data + exec edges and a container `$currentItem`.
 */
export function createBaseSeedHarness(): Harness {
  const source = instantiateFromCatalog("listSource", { id: "source" });
  const loop = instantiateFromCatalog("foreach", { id: "loop" });
  const worker = instantiateFromCatalog("implementor", {
    id: "worker",
    parentId: loop.id,
  });

  return {
    id: "base-seed",
    title: "Base seed harness",
    boundary: baseSeedBoundary(),
    nodes: [source, loop, worker],
    edges: [
      {
        kind: "data",
        from: { node: source.id, port: "items" },
        to: { node: loop.id, port: loop.iterablePortId },
      },
      {
        kind: "data",
        from: { node: loop.id, port: CURRENT_ITEM_PORT_ID },
        to: { node: worker.id, port: "task" },
      },
      { kind: "exec", from: source.id, to: loop.id },
      { kind: "exec", from: loop.id, to: worker.id },
    ],
    runConfig: structuredClone(EMPTY_RUN_CONFIG),
  };
}

/**
 * Live work-pool seed: list source → parallel live pool → fan-out body
 * that appends back into the pool (recursive fan-out + fixpoint end).
 */
export function createWorkPoolSeedHarness(): Harness {
  const source = instantiateFromCatalog("listSource", { id: "source" });
  const pool = instantiateFromCatalog("workPool", { id: "pool" });
  const fanOut = instantiateFromCatalog("fanOut", {
    id: "fanOut",
    parentId: pool.id,
    appendsTo: pool.id,
  });

  const harness: Harness = {
    id: "workpool-seed",
    title: "Work-pool seed harness",
    boundary: baseSeedBoundary(),
    nodes: [source, pool, fanOut],
    edges: [
      {
        kind: "data",
        from: { node: source.id, port: "items" },
        to: { node: pool.id, port: pool.iterablePortId },
      },
      {
        kind: "data",
        from: { node: pool.id, port: CURRENT_ITEM_PORT_ID },
        to: { node: fanOut.id, port: "task" },
      },
      { kind: "exec", from: source.id, to: pool.id },
      { kind: "exec", from: pool.id, to: fanOut.id },
    ],
    runConfig: structuredClone(EMPTY_RUN_CONFIG),
  };
  assertWorkPoolInvariants(harness);
  return harness;
}

/**
 * Live work-pools that intentionally trip advisory cues: one with no
 * appender, one missing a fixpoint end. Used by cue detection/render tests.
 */
export function createWorkPoolCueDemoHarness(): Harness {
  const source = instantiateFromCatalog("listSource", { id: "source" });
  const noAppender = instantiateFromCatalog("workPool", {
    id: "noAppender",
    title: "No appender pool",
  });
  const noFixpoint = instantiateFromCatalog("workPool", {
    id: "noFixpoint",
    title: "No fixpoint pool",
  });
  delete noFixpoint.end;
  const fanOut = instantiateFromCatalog("fanOut", {
    id: "fanOut",
    parentId: noFixpoint.id,
    appendsTo: noFixpoint.id,
  });

  return {
    id: "workpool-cue-demo",
    title: "Work-pool cue demo",
    boundary: baseSeedBoundary(),
    nodes: [source, noAppender, noFixpoint, fanOut],
    edges: [
      {
        kind: "data",
        from: { node: source.id, port: "items" },
        to: { node: noAppender.id, port: noAppender.iterablePortId },
      },
      {
        kind: "data",
        from: { node: source.id, port: "items" },
        to: { node: noFixpoint.id, port: noFixpoint.iterablePortId },
      },
      {
        kind: "data",
        from: { node: noFixpoint.id, port: CURRENT_ITEM_PORT_ID },
        to: { node: fanOut.id, port: "task" },
      },
      { kind: "exec", from: source.id, to: noAppender.id },
      { kind: "exec", from: source.id, to: noFixpoint.id },
      { kind: "exec", from: noFixpoint.id, to: fanOut.id },
    ],
    runConfig: structuredClone(EMPTY_RUN_CONFIG),
  };
}

/** Stable node ids for {@link createTrackerSeedHarness} — shared with the sim script. */
export const TRACKER_NODE_IDS = {
  source: "source",
  epic: "epic",
  storyStart: "storyStart",
  taskPool: "taskPool",
  worker: "worker",
  storyFinish: "storyFinish",
  epicFinish: "epicFinish",
} as const;

export const TRACKER_HARNESS_ID = "tracker-seed";

/**
 * Tracker harness: a recursive `Epic` story work-pool (parallel, live source,
 * fixpoint end) whose body runs a `story.start` hook, a nested **sequential**
 * `Task` container (the worker loop), and a `story.finish` hook that appends
 * stacked child stories back into the live Epic pool (recursive fan-out).
 * `epic.finish` runs once the pool reaches fixpoint. This is the issue-tracker
 * work loop expressed in the everything-is-a-node model.
 */
export function createTrackerSeedHarness(): Harness {
  const ids = TRACKER_NODE_IDS;
  const source = instantiateFromCatalog("listSource", { id: ids.source });
  const epic = instantiateFromCatalog("workPool", {
    id: ids.epic,
    title: "Epic",
  });
  const storyStart = instantiateFromCatalog("implementor", {
    id: ids.storyStart,
    title: "story.start",
    parentId: epic.id,
  });
  const taskPool = instantiateFromCatalog("foreach", {
    id: ids.taskPool,
    title: "Task",
    parentId: epic.id,
  });
  const worker = instantiateFromCatalog("implementor", {
    id: ids.worker,
    parentId: taskPool.id,
  });
  const storyFinish = instantiateFromCatalog("fanOut", {
    id: ids.storyFinish,
    title: "story.finish",
    parentId: epic.id,
    appendsTo: epic.id,
  });
  const epicFinish = instantiateFromCatalog("implementor", {
    id: ids.epicFinish,
    title: "epic.finish",
  });

  const harness: Harness = {
    id: TRACKER_HARNESS_ID,
    title: "Tracker harness",
    boundary: baseSeedBoundary(),
    nodes: [
      source,
      epic,
      storyStart,
      taskPool,
      worker,
      storyFinish,
      epicFinish,
    ],
    edges: [
      {
        kind: "data",
        from: { node: source.id, port: "items" },
        to: { node: epic.id, port: epic.iterablePortId },
      },
      {
        kind: "data",
        from: { node: epic.id, port: CURRENT_ITEM_PORT_ID },
        to: { node: storyStart.id, port: "task" },
      },
      {
        kind: "data",
        from: { node: epic.id, port: CURRENT_ITEM_PORT_ID },
        to: { node: storyFinish.id, port: "task" },
      },
      {
        kind: "data",
        from: { node: taskPool.id, port: CURRENT_ITEM_PORT_ID },
        to: { node: worker.id, port: "task" },
      },
      { kind: "exec", from: source.id, to: epic.id },
      { kind: "exec", from: epic.id, to: storyStart.id },
      { kind: "exec", from: storyStart.id, to: taskPool.id },
      { kind: "exec", from: taskPool.id, to: worker.id },
      { kind: "exec", from: taskPool.id, to: storyFinish.id },
      { kind: "exec", from: epic.id, to: epicFinish.id },
    ],
    runConfig: structuredClone(EMPTY_RUN_CONFIG),
  };
  assertWorkPoolInvariants(harness);
  return harness;
}

/**
 * Base seed plus a gate with ok/deny exec branches (and validators).
 * Used by exec-edge tests — not the default editor seed.
 */
export function createBranchingSeedHarness(): Harness {
  const base = createBaseSeedHarness();
  const gate = instantiateFromCatalog("gate", {
    id: "gate",
    parentId: "loop",
  });
  const onOk = instantiateFromCatalog("validator", {
    id: "onOk",
    parentId: "loop",
  });
  const onDeny = instantiateFromCatalog("validator", {
    id: "onDeny",
    parentId: "loop",
  });

  return {
    ...base,
    id: "branching-seed",
    title: "Branching seed harness",
    nodes: [...base.nodes, gate, onOk, onDeny],
    edges: [
      ...base.edges,
      {
        kind: "data",
        from: { node: "worker", port: "result" },
        to: { node: gate.id, port: "prompt" },
      },
      {
        kind: "data",
        from: { node: "loop", port: CURRENT_ITEM_PORT_ID },
        to: { node: onOk.id, port: "task" },
      },
      {
        kind: "data",
        from: { node: "loop", port: CURRENT_ITEM_PORT_ID },
        to: { node: onDeny.id, port: "task" },
      },
      { kind: "exec", from: "worker", to: gate.id },
      { kind: "exec", from: gate.id, to: onOk.id, branch: "ok" },
      { kind: "exec", from: gate.id, to: onDeny.id, branch: "deny" },
    ],
  };
}
