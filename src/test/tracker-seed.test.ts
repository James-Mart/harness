import { describe, expect, it } from "vitest";

import {
  assertWorkPoolInvariants,
  createTrackerSeedHarness,
  TRACKER_NODE_IDS,
  type ContainerNode,
  type LeafNode,
} from "@/model";
import {
  createRunState,
  isRunFixpoint,
  settleAll,
  step,
  trackerSeedSimScript,
  trackerStoryStackSpawn,
  trackerStoryTaskSpawn,
  trackerTaskIds,
  TRACKER_STORY_PATH,
  TRACKER_STRESS_ROOTS,
  TRACKER_STRESS_TREE,
} from "@/sim";
import { runToFixpoint } from "@/test/runToFixpoint";

describe("tracker seed harness", () => {
  it("nests a sequential Task container inside a parallel Epic work-pool", () => {
    const harness = createTrackerSeedHarness();
    const ids = TRACKER_NODE_IDS;
    expect(() => assertWorkPoolInvariants(harness)).not.toThrow();

    const epic = harness.nodes.find((n) => n.id === ids.epic) as ContainerNode;
    expect(epic.kind).toBe("container");
    expect(epic.source.kind).toBe("live");
    expect(epic.concurrency.kind).toBe("parallel");
    expect(epic.end?.kind).toBe("fixpoint");

    const taskPool = harness.nodes.find(
      (n) => n.id === ids.taskPool,
    ) as ContainerNode;
    expect(taskPool.kind).toBe("container");
    expect(taskPool.parentId).toBe(ids.epic);
    expect(taskPool.source.kind).toBe("snapshot");
    expect(taskPool.concurrency.kind).toBe("sequential");

    // The finish hook is the recursive appender feeding the live Epic pool.
    const storyFinish = harness.nodes.find(
      (n) => n.id === ids.storyFinish,
    ) as LeafNode;
    expect(storyFinish.appendsTo).toBe(ids.epic);
  });

  it("expands the script to the Epic ▸ Story stress tree", () => {
    const script = trackerSeedSimScript;
    const ids = TRACKER_NODE_IDS;

    expect(script.roots).toEqual([...TRACKER_STRESS_ROOTS]);

    for (const story of TRACKER_STRESS_TREE) {
      const item = script.items[story.id]!;
      expect(item.label).toBe(story.label);
      expect(item.containerId).toBe(ids.epic);
      expect(item.path).toEqual([...TRACKER_STORY_PATH]);

      const taskIds = trackerTaskIds(story);
      expect(trackerStoryTaskSpawn(item)).toEqual(taskIds);
      expect(trackerStoryStackSpawn(item)).toEqual([...(story.stacks ?? [])]);

      for (const [index, taskId] of taskIds.entries()) {
        const task = script.items[taskId]!;
        expect(task.containerId).toBe(ids.taskPool);
        expect(task.label).toBe(`${story.label} · Task ${index + 1}`);
        expect(task.path).toEqual([{ node: ids.worker }]);
      }
    }
  });

  it("runs Story 1 + Story 2 in parallel, then stacks Story 3 + Story 4", () => {
    const harness = createTrackerSeedHarness();
    const ids = TRACKER_NODE_IDS;
    const stacked = TRACKER_STRESS_TREE.find(
      (story) => story.id === "story-2",
    )!.stacks!;
    let state = createRunState({
      harness,
      script: trackerSeedSimScript,
      seed: 1,
    });

    // Both roots wait in the live Epic pool before the first step.
    expect(state.pools[ids.epic]?.ready).toEqual([...TRACKER_STRESS_ROOTS]);
    expect(state.pools[ids.taskPool]?.ready).toEqual([]);

    // First step admits both stories concurrently (parallel work-pool).
    state = step(state);
    expect([...(state.pools[ids.epic]?.inFlight ?? [])].sort()).toEqual([
      ...TRACKER_STRESS_ROOTS,
    ].sort());
    expect(Object.keys(state.cursors).sort()).toEqual(
      [...TRACKER_STRESS_ROOTS].sort(),
    );

    // One step/settle per body node completes both roots.
    state = settleAll(state);
    for (let i = 1; i < TRACKER_STORY_PATH.length; i += 1) {
      state = settleAll(step(state));
    }

    expect([...(state.pools[ids.epic]?.done ?? [])].sort()).toEqual(
      [...TRACKER_STRESS_ROOTS].sort(),
    );
    // Story 2's finish appended the stacked children back into the live pool;
    // they are ready (re-entered the pool) but not yet admitted.
    expect([...(state.pools[ids.epic]?.ready ?? [])].sort()).toEqual(
      [...stacked].sort(),
    );
    expect(state.pools[ids.epic]?.inFlight).toEqual([]);
  });

  it("drives the whole tree to fixpoint deterministically", () => {
    const ids = TRACKER_NODE_IDS;
    const allStoryIds = TRACKER_STRESS_TREE.map((story) => story.id);
    const totalTasks = TRACKER_STRESS_TREE.reduce(
      (sum, story) => sum + story.taskCount,
      0,
    );
    const terminal = runToFixpoint(
      createRunState({
        harness: createTrackerSeedHarness(),
        script: trackerSeedSimScript,
        seed: 7,
      }),
    );

    expect(terminal.status).toBe("fixpoint");
    expect(isRunFixpoint(terminal)).toBe(true);
    expect([...(terminal.pools[ids.epic]?.done ?? [])].sort()).toEqual(
      [...allStoryIds].sort(),
    );
    expect(terminal.pools[ids.taskPool]?.done).toHaveLength(totalTasks);
    expect(Object.keys(terminal.cursors)).toHaveLength(0);
  });
});
