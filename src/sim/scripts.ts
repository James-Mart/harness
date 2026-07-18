import type { SimScript } from "@/sim/types";

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
