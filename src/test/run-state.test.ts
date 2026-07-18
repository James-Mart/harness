import { describe, expect, it } from "vitest";

import { createBaseSeedHarness, createWorkPoolSeedHarness } from "@/model";
import {
  MAX_TRANSITION_MS,
  MIN_TRANSITION_MS,
  advanceTime,
  baseSeedSimScript,
  createRunState,
  isRunFixpoint,
  isSettled,
  nextUnitInterval,
  pendingDurations,
  randomTransitionMs,
  settleAll,
  settleNext,
  step,
  workPoolSeedSimScript,
  type RunState,
} from "@/sim";
import { runToFixpoint } from "@/test/runToFixpoint";

function terminalSnapshot(state: RunState) {
  return {
    status: state.status,
    nowMs: state.nowMs,
    rngState: state.rngState,
    pools: state.pools,
    cursors: state.cursors,
  };
}

describe("seeded RNG durations", () => {
  it("draws transition durations in [1000, 5000] ms", () => {
    let state = 42;
    for (let i = 0; i < 50; i += 1) {
      const drawn = randomTransitionMs(state);
      expect(drawn.ms).toBeGreaterThanOrEqual(MIN_TRANSITION_MS);
      expect(drawn.ms).toBeLessThanOrEqual(MAX_TRANSITION_MS);
      state = drawn.state;
    }
  });

  it("is reproducible for the same seed", () => {
    const drawSeries = (seed: number) => {
      let state = seed;
      return Array.from({ length: 8 }, () => {
        const drawn = randomTransitionMs(state);
        state = drawn.state;
        return drawn.ms;
      });
    };
    expect(drawSeries(7)).toEqual(drawSeries(7));
    expect(nextUnitInterval(1).value).toEqual(nextUnitInterval(1).value);
  });
});

describe("base seed script", () => {
  it("runs to fixpoint with all roots done", () => {
    const harness = createBaseSeedHarness();
    const terminal = runToFixpoint(
      createRunState({ harness, script: baseSeedSimScript, seed: 1 }),
    );

    expect(terminal.status).toBe("fixpoint");
    expect(isRunFixpoint(terminal)).toBe(true);
    expect(terminal.pools.loop).toEqual({
      ready: [],
      inFlight: [],
      done: ["task-1", "task-2", "task-3"],
    });
    expect(Object.keys(terminal.cursors)).toHaveLength(0);
  });

  it("advances sequential items one cursor at a time", () => {
    const harness = createBaseSeedHarness();
    let state = createRunState({
      harness,
      script: baseSeedSimScript,
      seed: 11,
    });

    state = step(state);
    expect(Object.keys(state.cursors)).toEqual(["task-1"]);
    expect(state.pools.loop?.inFlight).toEqual(["task-1"]);
    expect(state.pools.loop?.ready).toEqual(["task-2", "task-3"]);

    state = settleAll(state);
    expect(state.pools.loop?.done).toEqual(["task-1"]);
    expect(state.pools.loop?.ready).toEqual(["task-2", "task-3"]);
    expect(isSettled(state)).toBe(true);
  });
});

describe("work-pool seed script", () => {
  it("grows the live pool via fan-out then reaches fixpoint", () => {
    const harness = createWorkPoolSeedHarness();
    let state = createRunState({
      harness,
      script: workPoolSeedSimScript,
      seed: 3,
    });

    expect(state.pools.pool?.ready).toEqual(["root-a", "root-b"]);

    state = step(state);
    // Parallel pool admits both roots as concurrent cursors.
    expect(Object.keys(state.cursors).sort()).toEqual(["root-a", "root-b"]);
    expect([...(state.pools.pool?.inFlight ?? [])].sort()).toEqual([
      "root-a",
      "root-b",
    ]);

    state = settleAll(state);
    // Fan-out appends children as roots complete; admission waits for next step.
    expect([...(state.pools.pool?.done ?? [])].sort()).toEqual([
      "root-a",
      "root-b",
    ]);
    expect([...(state.pools.pool?.ready ?? [])].sort()).toEqual([
      "child-a1",
      "child-b1",
      "child-b2",
    ]);
    expect(state.pools.pool?.ready.length).toBeGreaterThan(2);

    const terminal = runToFixpoint(state);
    expect(terminal.status).toBe("fixpoint");
    expect(isRunFixpoint(terminal)).toBe(true);
    expect(terminal.pools.pool?.ready).toEqual([]);
    expect(terminal.pools.pool?.inFlight).toEqual([]);
    expect([...(terminal.pools.pool?.done ?? [])].sort()).toEqual([
      "child-a1",
      "child-b1",
      "child-b2",
      "root-a",
      "root-b",
    ]);
  });

  it("lands parallel transitions at staggered times within a step", () => {
    const harness = createWorkPoolSeedHarness();
    let state = createRunState({
      harness,
      script: workPoolSeedSimScript,
      seed: 99,
    });

    state = step(state);
    const durations = pendingDurations(state);
    expect(Object.keys(durations).sort()).toEqual(["root-a", "root-b"]);
    expect(durations["root-a"]).not.toEqual(durations["root-b"]);

    const landsA = state.cursors["root-a"]!.pending!.landsAtMs;
    const landsB = state.cursors["root-b"]!.pending!.landsAtMs;
    const earlier = Math.min(landsA, landsB);
    const earlierId = landsA < landsB ? "root-a" : "root-b";
    const laterId = earlierId === "root-a" ? "root-b" : "root-a";

    state = advanceTime(state, earlier);
    expect(state.pools.pool?.done).toEqual([earlierId]);
    expect(state.cursors[laterId]?.pending).toBeDefined();
    expect(isSettled(state)).toBe(false);

    // Fan-out from the earlier root only so far.
    const expectedChildren =
      earlierId === "root-a" ? ["child-a1"] : ["child-b1", "child-b2"];
    expect(state.pools.pool?.ready).toEqual(expectedChildren);

    state = settleNext(state);
    expect(isSettled(state)).toBe(true);
    expect([...(state.pools.pool?.done ?? [])].sort()).toEqual([
      "root-a",
      "root-b",
    ]);
  });

  it("drives the full script to fixpoint from a fresh run", () => {
    const terminal = runToFixpoint(
      createRunState({
        harness: createWorkPoolSeedHarness(),
        script: workPoolSeedSimScript,
        seed: 5,
      }),
    );
    expect(terminal.status).toBe("fixpoint");
    expect(terminal.pools.pool?.done).toHaveLength(5);
  });

  it("yields identical terminals for the same harness/script/seed", () => {
    const opts = {
      harness: createWorkPoolSeedHarness(),
      script: workPoolSeedSimScript,
      seed: 12345,
    } as const;
    const a = runToFixpoint(createRunState(opts));
    const b = runToFixpoint(createRunState(opts));
    expect(terminalSnapshot(a)).toEqual(terminalSnapshot(b));
  });
});
