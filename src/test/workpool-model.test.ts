import { describe, expect, it } from "vitest";

import {
  EMPTY_RUN_CONFIG,
  advisoryCuesForContainer,
  appendToReadySet,
  assertWorkPoolInvariants,
  availableSlots,
  availableSlotsFor,
  createReadySet,
  createWorkPoolSeedHarness,
  effectiveConcurrency,
  instantiateFromCatalog,
  isFixpoint,
  liveContainersWithoutAppender,
  maxConcurrencyOf,
  nodesAppendingTo,
  workPoolsMissingFixpoint,
  type Harness,
} from "@/model";

describe("work-pool model", () => {
  it("represents live source, parallel concurrency, and fixpoint end", () => {
    const pool = instantiateFromCatalog("workPool", { id: "pool" });
    expect(pool.kind).toBe("container");
    if (pool.kind !== "container") throw new Error("expected container");

    expect(pool.source).toEqual({ kind: "live" });
    expect(pool.concurrency).toEqual({
      kind: "parallel",
      maxConcurrency: 4,
    });
    expect(pool.end).toEqual({ kind: "fixpoint" });
  });

  it("represents sequential vs parallel-up-to-N concurrency policy", () => {
    expect(maxConcurrencyOf({ kind: "sequential" })).toBe(1);
    expect(maxConcurrencyOf({ kind: "parallel", maxConcurrency: 3 })).toBe(3);
    expect(maxConcurrencyOf({ kind: "parallel" })).toBe(
      Number.POSITIVE_INFINITY,
    );

    const sequential = instantiateFromCatalog("foreach", { id: "loop" });
    expect(sequential.concurrency).toEqual({ kind: "sequential" });
    expect(maxConcurrencyOf(sequential.concurrency)).toBe(1);

    const capped = instantiateFromCatalog("workPool", {
      id: "pool",
      concurrency: { kind: "parallel", maxConcurrency: 2 },
    });
    expect(capped.concurrency).toEqual({
      kind: "parallel",
      maxConcurrency: 2,
    });
  });

  it("merges run-config maxConcurrency into effective concurrency", () => {
    const pool = instantiateFromCatalog("workPool", { id: "pool" });
    if (pool.kind !== "container") throw new Error("expected container");

    const harness: Harness = {
      id: "cfg",
      title: "cfg",
      boundary: [],
      nodes: [pool],
      edges: [],
      runConfig: {
        ...EMPTY_RUN_CONFIG,
        perContainer: { pool: { maxConcurrency: 2 } },
      },
    };

    expect(effectiveConcurrency(harness, pool)).toEqual({
      kind: "parallel",
      maxConcurrency: 2,
    });

    const slots = availableSlotsFor(
      harness,
      pool,
      createReadySet(["a", "b", "c"]),
    );
    expect(slots).toBe(2);

    const sequential = instantiateFromCatalog("foreach", { id: "loop" });
    const seqHarness: Harness = {
      ...harness,
      nodes: [sequential],
      runConfig: {
        ...EMPTY_RUN_CONFIG,
        perContainer: { loop: { maxConcurrency: 8 } },
      },
    };
    expect(effectiveConcurrency(seqHarness, sequential)).toEqual({
      kind: "sequential",
    });
  });

  it("models append/fan-out onto a live ready-set", () => {
    const harness = createWorkPoolSeedHarness();
    const pool = harness.nodes.find((node) => node.id === "pool");
    expect(pool?.kind).toBe("container");
    if (pool?.kind !== "container") throw new Error("expected work pool");

    expect(pool.source).toEqual({ kind: "live" });
    expect(pool.end).toEqual({ kind: "fixpoint" });
    expect(pool.concurrency).toEqual({
      kind: "parallel",
      maxConcurrency: 4,
    });

    const appenders = nodesAppendingTo(harness, pool.id);
    expect(appenders).toHaveLength(1);
    expect(appenders[0]?.id).toBe("fanOut");
    expect(appenders[0]?.appendsTo).toBe(pool.id);
    expect(appenders[0]?.parentId).toBe(pool.id);
    expect(appenders[0]?.ports.map((port) => port.id)).toEqual(["task"]);

    let readySet = createReadySet(["root-a", "root-b"]);
    expect(readySet.ready).toEqual(["root-a", "root-b"]);

    readySet = appendToReadySet(readySet, ["child-1", "child-2"]);
    expect(readySet.ready).toEqual(["root-a", "root-b", "child-1", "child-2"]);

    // Fan-out dedupes against ready / in-flight / done.
    readySet = {
      ready: ["root-a"],
      inFlight: ["child-1"],
      done: ["root-b"],
    };
    readySet = appendToReadySet(readySet, [
      "root-a",
      "child-1",
      "root-b",
      "child-3",
    ]);
    expect(readySet.ready).toEqual(["root-a", "child-3"]);
    expect(readySet.inFlight).toEqual(["child-1"]);
    expect(readySet.done).toEqual(["root-b"]);
  });

  it("detects the fixpoint condition (no ready, none in flight)", () => {
    expect(isFixpoint(createReadySet())).toBe(true);
    expect(isFixpoint({ ready: [], inFlight: [], done: ["a", "b"] })).toBe(
      true,
    );

    expect(isFixpoint(createReadySet(["a"]))).toBe(false);
    expect(isFixpoint({ ready: [], inFlight: ["a"], done: [] })).toBe(false);
    expect(isFixpoint({ ready: ["a"], inFlight: ["b"], done: [] })).toBe(false);

    // After fan-out drains: append then clear — fixpoint only when both empty.
    let pool = createReadySet(["root"]);
    pool = appendToReadySet(pool, ["child"]);
    expect(isFixpoint(pool)).toBe(false);
    pool = { ready: [], inFlight: [], done: ["root", "child"] };
    expect(isFixpoint(pool)).toBe(true);
  });

  it("computes available concurrency slots from policy + in-flight", () => {
    const pool = {
      ready: ["a", "b", "c"],
      inFlight: ["x"],
      done: [] as string[],
    };
    expect(availableSlots(pool, { kind: "sequential" })).toBe(0);
    expect(availableSlots(pool, { kind: "parallel", maxConcurrency: 3 })).toBe(
      2,
    );
    expect(availableSlots(pool, { kind: "parallel" })).toBe(3);

    const emptyReady = { ready: [] as string[], inFlight: ["x"], done: [] };
    expect(
      availableSlots(emptyReady, { kind: "parallel", maxConcurrency: 4 }),
    ).toBe(0);
  });

  it("treats snapshot foreach as non-live without fixpoint end", () => {
    const loop = instantiateFromCatalog("foreach", { id: "loop" });
    expect(loop.source.kind).toBe("snapshot");
    expect(loop.end).toBeUndefined();
  });

  it("exposes cue predicates for missing appender / fixpoint", () => {
    const liveNoAppender = instantiateFromCatalog("workPool", {
      id: "orphan",
    });
    const withDefaultEnd = instantiateFromCatalog("workPool", { id: "nofix" });
    const bareLive = { ...withDefaultEnd };
    delete bareLive.end;
    const harness: Harness = {
      id: "cues",
      title: "cues",
      boundary: [],
      nodes: [liveNoAppender, bareLive],
      edges: [],
      runConfig: structuredClone(EMPTY_RUN_CONFIG),
    };

    expect(liveContainersWithoutAppender(harness).map((n) => n.id)).toEqual([
      "orphan",
      "nofix",
    ]);
    expect(workPoolsMissingFixpoint(harness).map((n) => n.id)).toEqual([
      "nofix",
    ]);
    expect(advisoryCuesForContainer(harness, "orphan")).toEqual([
      "missing-appender",
    ]);
    expect(advisoryCuesForContainer(harness, "nofix")).toEqual([
      "missing-appender",
      "missing-fixpoint",
    ]);
    const seed = createWorkPoolSeedHarness();
    expect(liveContainersWithoutAppender(seed)).toEqual([]);
    expect(workPoolsMissingFixpoint(seed)).toEqual([]);
    expect(advisoryCuesForContainer(seed, "pool")).toEqual([]);
  });

  it("rejects inconsistent source/end and invalid appendsTo targets", () => {
    expect(() =>
      instantiateFromCatalog("workPool", {
        id: "bad",
        source: { kind: "snapshot" },
        end: { kind: "fixpoint" },
      }),
    ).toThrow(/fixpoint end requires a live source/);

    const snapshot = instantiateFromCatalog("foreach", { id: "loop" });
    const leaf = instantiateFromCatalog("fanOut", {
      id: "fan",
      appendsTo: snapshot.id,
    });
    const badHarness: Harness = {
      id: "bad",
      title: "bad",
      boundary: [],
      nodes: [snapshot, leaf],
      edges: [],
      runConfig: structuredClone(EMPTY_RUN_CONFIG),
    };
    expect(() => assertWorkPoolInvariants(badHarness)).toThrow(
      /not a live source/,
    );

    expect(() =>
      assertWorkPoolInvariants({
        ...badHarness,
        nodes: [
          instantiateFromCatalog("fanOut", {
            id: "fan",
            appendsTo: "missing",
          }),
        ],
      }),
    ).toThrow(/not a container/);
  });
});
