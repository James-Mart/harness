import {
  EUNOMIO_HARNESS_ID,
  EUNOMIO_NODE_IDS,
  TRACKER_HARNESS_ID,
  TRACKER_NODE_IDS,
} from "@/model/seed";
import type { Harness, NodeId } from "@/model/types";
import type { SimItem, SimPathStep, SimScript } from "@/sim/types";

/**
 * Deterministic script for {@link createBaseSeedHarness}: three tasks through
 * the sequential snapshot foreach body (`worker`).
 */
export const baseSeedSimScript: SimScript = {
  roots: ["task-1", "task-2", "task-3"],
  items: {
    "task-1": {
      id: "task-1",
      label: "Task 1",
      containerId: "loop",
      path: [{ node: "worker" }],
    },
    "task-2": {
      id: "task-2",
      label: "Task 2",
      containerId: "loop",
      path: [{ node: "worker" }],
    },
    "task-3": {
      id: "task-3",
      label: "Task 3",
      containerId: "loop",
      path: [{ node: "worker" }],
    },
  },
};

/**
 * Deterministic script for {@link createWorkPoolSeedHarness}: two roots fan
 * out into the live pool, then children run without further spawning so the
 * pool reaches fixpoint.
 */
export const workPoolSeedSimScript: SimScript = {
  roots: ["root-a", "root-b"],
  items: {
    "root-a": {
      id: "root-a",
      label: "Root A",
      containerId: "pool",
      path: [{ node: "fanOut" }],
      spawns: [
        {
          atNode: "fanOut",
          containerId: "pool",
          items: ["child-a1"],
        },
      ],
    },
    "root-b": {
      id: "root-b",
      label: "Root B",
      containerId: "pool",
      path: [{ node: "fanOut" }],
      spawns: [
        {
          atNode: "fanOut",
          containerId: "pool",
          items: ["child-b1", "child-b2"],
        },
      ],
    },
    "child-a1": {
      id: "child-a1",
      label: "Child A1",
      containerId: "pool",
      path: [{ node: "fanOut" }],
    },
    "child-b1": {
      id: "child-b1",
      label: "Child B1",
      containerId: "pool",
      path: [{ node: "fanOut" }],
    },
    "child-b2": {
      id: "child-b2",
      label: "Child B2",
      containerId: "pool",
      path: [{ node: "fanOut" }],
    },
  },
};

/**
 * Declarative stress tree for the tracker seed. Single source of truth for
 * script generation and test expectations: Epic ▸ Story 1 (Task 1–3),
 * Story 2 (Task 1–3), with Story 3 / Story 4 (Task 1 each) stacked on Story 2.
 */
export type TrackerStoryDef = {
  id: string;
  label: string;
  taskCount: number;
  /** Story ids appended into the live Epic pool when this story finishes. */
  stacks?: readonly string[];
};

/** Initial ready-set — Story 1 and Story 2 enter the Epic pool together. */
export const TRACKER_STRESS_ROOTS = ["story-1", "story-2"] as const;

export const TRACKER_STRESS_TREE: readonly TrackerStoryDef[] = [
  { id: "story-1", label: "Story 1", taskCount: 3 },
  {
    id: "story-2",
    label: "Story 2",
    taskCount: 3,
    stacks: ["story-3", "story-4"],
  },
  { id: "story-3", label: "Story 3", taskCount: 1 },
  { id: "story-4", label: "Story 4", taskCount: 1 },
];

/** Epic body traversal shared by every story item. */
export const TRACKER_STORY_PATH: readonly SimPathStep[] = [
  { node: TRACKER_NODE_IDS.storyStart },
  { node: TRACKER_NODE_IDS.taskPool },
  { node: TRACKER_NODE_IDS.storyFinish },
];

/** Task ids for a story: `s{n}-task-{m}` derived from `story-{n}`. */
export function trackerTaskIds(story: TrackerStoryDef): string[] {
  const n = story.id.replace(/^story-/, "");
  return Array.from(
    { length: story.taskCount },
    (_, i) => `s${n}-task-${i + 1}`,
  );
}

/** Spawn item ids fired at `atNode` into `containerId`, if any. */
export function spawnItemsAt(
  item: SimItem,
  atNode: NodeId,
  containerId: NodeId,
): string[] {
  const spawn = item.spawns?.find(
    (entry) => entry.atNode === atNode && entry.containerId === containerId,
  );
  return spawn ? [...spawn.items] : [];
}

/** Task spawn items a story fans into the Task pool (beside the builder). */
export function trackerStoryTaskSpawn(item: SimItem): string[] {
  return spawnItemsAt(
    item,
    TRACKER_NODE_IDS.taskPool,
    TRACKER_NODE_IDS.taskPool,
  );
}

/** Stacked-story spawn items a story appends into the Epic pool on finish. */
export function trackerStoryStackSpawn(item: SimItem): string[] {
  return spawnItemsAt(
    item,
    TRACKER_NODE_IDS.storyFinish,
    TRACKER_NODE_IDS.epic,
  );
}

function buildTrackerSeedSimScript(): SimScript {
  const ids = TRACKER_NODE_IDS;
  const items: Record<string, SimItem> = {};

  for (const story of TRACKER_STRESS_TREE) {
    const taskIds = trackerTaskIds(story);
    items[story.id] = {
      id: story.id,
      label: story.label,
      containerId: ids.epic,
      path: [...TRACKER_STORY_PATH],
      spawns: [
        {
          atNode: ids.taskPool,
          containerId: ids.taskPool,
          items: taskIds,
        },
        ...(story.stacks
          ? [
              {
                atNode: ids.storyFinish,
                containerId: ids.epic,
                items: [...story.stacks],
              },
            ]
          : []),
      ],
    };

    for (const [index, taskId] of taskIds.entries()) {
      items[taskId] = {
        id: taskId,
        label: `${story.label} · Task ${index + 1}`,
        containerId: ids.taskPool,
        path: [{ node: ids.worker }],
      };
    }
  }

  return {
    roots: [...TRACKER_STRESS_ROOTS],
    items,
  };
}

/**
 * Deterministic script for {@link createTrackerSeedHarness}, built from
 * {@link TRACKER_STRESS_TREE}.
 */
export const trackerSeedSimScript: SimScript = buildTrackerSeedSimScript();

/**
 * Declarative partition tree for the eunomio seed. Single source of truth for
 * script generation and test expectations: Edge A splits → A1 (splits → A1x,
 * A1y) + A2; Edge B is a leaf. Roots A + B enter the Partition pool together.
 */
export type EunomioEdgeDef = {
  id: string;
  label: string;
  /** Exactly two child edge ids when this edge splits; omit for a leaf. */
  children?: readonly [string, string];
};

/** Initial ready-set — Edge A and Edge B enter the Partition pool together. */
export const EUNOMIO_PARTITION_ROOTS = ["edge-a", "edge-b"] as const;

export const EUNOMIO_PARTITION_TREE: readonly EunomioEdgeDef[] = [
  { id: "edge-a", label: "Edge A", children: ["edge-a1", "edge-a2"] },
  { id: "edge-b", label: "Edge B" },
  { id: "edge-a1", label: "Edge A1", children: ["edge-a1x", "edge-a1y"] },
  { id: "edge-a2", label: "Edge A2" },
  { id: "edge-a1x", label: "Edge A1x" },
  { id: "edge-a1y", label: "Edge A1y" },
];

/** Body path when Planner chooses split (ok) → Constructor → Accept. */
export const EUNOMIO_SPLIT_PATH: readonly SimPathStep[] = [
  { node: EUNOMIO_NODE_IDS.planner },
  { node: EUNOMIO_NODE_IDS.splitGate, branch: "ok" },
  { node: EUNOMIO_NODE_IDS.constructor },
  { node: EUNOMIO_NODE_IDS.accept },
];

/** Body path when Planner chooses indivisible (deny) → Leaf. */
export const EUNOMIO_LEAF_PATH: readonly SimPathStep[] = [
  { node: EUNOMIO_NODE_IDS.planner },
  { node: EUNOMIO_NODE_IDS.splitGate, branch: "deny" },
  { node: EUNOMIO_NODE_IDS.leaf },
];

/** Child edge ids Accept appends into the Partition pool for a split edge. */
export function eunomioEdgeChildSpawn(item: SimItem): string[] {
  return spawnItemsAt(
    item,
    EUNOMIO_NODE_IDS.accept,
    EUNOMIO_NODE_IDS.partition,
  );
}

function buildEunomioSeedSimScript(): SimScript {
  const ids = EUNOMIO_NODE_IDS;
  const items: Record<string, SimItem> = {};

  for (const edge of EUNOMIO_PARTITION_TREE) {
    if (edge.children) {
      items[edge.id] = {
        id: edge.id,
        label: edge.label,
        containerId: ids.partition,
        path: [...EUNOMIO_SPLIT_PATH],
        spawns: [
          {
            atNode: ids.accept,
            containerId: ids.partition,
            items: [...edge.children],
          },
        ],
      };
    } else {
      items[edge.id] = {
        id: edge.id,
        label: edge.label,
        containerId: ids.partition,
        path: [...EUNOMIO_LEAF_PATH],
      };
    }
  }

  return {
    roots: [...EUNOMIO_PARTITION_ROOTS],
    items,
  };
}

/**
 * Deterministic script for {@link createEunomioSeedHarness}, built from
 * {@link EUNOMIO_PARTITION_TREE}.
 */
export const eunomioSeedSimScript: SimScript = buildEunomioSeedSimScript();

/** Empty script — Run mode with no known seed script reaches fixpoint immediately. */
export const emptySimScript: SimScript = { roots: [], items: {} };

/**
 * Pick the deterministic mock script for a known seed harness id.
 * Unknown harnesses get {@link emptySimScript}.
 */
export function scriptForHarness(harness: Harness): SimScript {
  switch (harness.id) {
    case "base-seed":
    case "branching-seed":
      return baseSeedSimScript;
    case "workpool-seed":
      return workPoolSeedSimScript;
    case TRACKER_HARNESS_ID:
      return trackerSeedSimScript;
    case EUNOMIO_HARNESS_ID:
      return eunomioSeedSimScript;
    default:
      return emptySimScript;
  }
}
