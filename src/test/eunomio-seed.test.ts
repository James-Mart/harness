import { describe, expect, it } from "vitest";

import {
  assertWorkPoolInvariants,
  createEunomioSeedHarness,
  EUNOMIO_NODE_IDS,
  type ContainerNode,
  type LeafNode,
} from "@/model";
import {
  createRunState,
  eunomioEdgeChildSpawn,
  eunomioSeedSimScript,
  EUNOMIO_LEAF_PATH,
  EUNOMIO_PARTITION_ROOTS,
  EUNOMIO_PARTITION_TREE,
  EUNOMIO_SPLIT_PATH,
  isRunFixpoint,
  settleAll,
  step,
} from "@/sim";
import { runToFixpoint } from "@/test/runToFixpoint";

describe("eunomio seed harness", () => {
  it("nests Planner → split? → Constructor/Accept | Leaf inside a parallel Partition pool", () => {
    const harness = createEunomioSeedHarness();
    const ids = EUNOMIO_NODE_IDS;
    expect(() => assertWorkPoolInvariants(harness)).not.toThrow();

    const partition = harness.nodes.find(
      (n) => n.id === ids.partition,
    ) as ContainerNode;
    expect(partition.kind).toBe("container");
    expect(partition.title).toBe("Partition");
    expect(partition.source.kind).toBe("live");
    expect(partition.concurrency.kind).toBe("parallel");
    expect(partition.end?.kind).toBe("fixpoint");

    for (const id of [
      ids.planner,
      ids.splitGate,
      ids.constructor,
      ids.accept,
      ids.leaf,
    ] as const) {
      const node = harness.nodes.find((n) => n.id === id)!;
      expect(node.parentId).toBe(ids.partition);
    }

    const accept = harness.nodes.find((n) => n.id === ids.accept) as LeafNode;
    expect(accept.appendsTo).toBe(ids.partition);

    const splitOk = harness.edges.find(
      (e) =>
        e.kind === "exec" &&
        e.from === ids.splitGate &&
        e.to === ids.constructor &&
        e.branch === "ok",
    );
    const splitDeny = harness.edges.find(
      (e) =>
        e.kind === "exec" &&
        e.from === ids.splitGate &&
        e.to === ids.leaf &&
        e.branch === "deny",
    );
    expect(splitOk).toBeDefined();
    expect(splitDeny).toBeDefined();

    expect(
      harness.edges.some(
        (e) =>
          e.kind === "exec" && e.from === ids.partition && e.to === ids.reorder,
      ),
    ).toBe(true);
    expect(
      harness.edges.some(
        (e) =>
          e.kind === "exec" && e.from === ids.reorder && e.to === ids.shaver,
      ),
    ).toBe(true);
  });

  it("expands the script to the partition tree that fans out then terminates", () => {
    const script = eunomioSeedSimScript;
    const ids = EUNOMIO_NODE_IDS;

    expect(script.roots).toEqual([...EUNOMIO_PARTITION_ROOTS]);

    for (const edge of EUNOMIO_PARTITION_TREE) {
      const item = script.items[edge.id]!;
      expect(item.label).toBe(edge.label);
      expect(item.containerId).toBe(ids.partition);

      if (edge.children) {
        expect(item.path).toEqual([...EUNOMIO_SPLIT_PATH]);
        expect(eunomioEdgeChildSpawn(item)).toEqual([...edge.children]);
      } else {
        expect(item.path).toEqual([...EUNOMIO_LEAF_PATH]);
        expect(eunomioEdgeChildSpawn(item)).toEqual([]);
      }
    }
  });

  it("runs Edge A + Edge B in parallel, then fans out A's children", () => {
    const harness = createEunomioSeedHarness();
    const ids = EUNOMIO_NODE_IDS;
    const edgeA = EUNOMIO_PARTITION_TREE.find((e) => e.id === "edge-a")!;
    let state = createRunState({
      harness,
      script: eunomioSeedSimScript,
      seed: 1,
    });

    expect(state.pools[ids.partition]?.ready).toEqual([
      ...EUNOMIO_PARTITION_ROOTS,
    ]);

    // First step admits both roots concurrently (parallel work-pool).
    state = step(state);
    expect([...(state.pools[ids.partition]?.inFlight ?? [])].sort()).toEqual(
      [...EUNOMIO_PARTITION_ROOTS].sort(),
    );
    expect(Object.keys(state.cursors).sort()).toEqual(
      [...EUNOMIO_PARTITION_ROOTS].sort(),
    );

    // Drain split path (4 nodes) and leaf path (3 nodes) — settle longest.
    state = settleAll(state);
    for (let i = 1; i < EUNOMIO_SPLIT_PATH.length; i += 1) {
      state = settleAll(step(state));
    }

    expect([...(state.pools[ids.partition]?.done ?? [])].sort()).toEqual(
      [...EUNOMIO_PARTITION_ROOTS].sort(),
    );
    // Edge A's Accept appended children; Edge B was a leaf (no spawn).
    expect([...(state.pools[ids.partition]?.ready ?? [])].sort()).toEqual(
      [...edgeA.children!].sort(),
    );
    expect(state.pools[ids.partition]?.inFlight).toEqual([]);
  });

  it("drives the whole partition tree to fixpoint deterministically", () => {
    const ids = EUNOMIO_NODE_IDS;
    const allEdgeIds = EUNOMIO_PARTITION_TREE.map((edge) => edge.id);
    const terminal = runToFixpoint(
      createRunState({
        harness: createEunomioSeedHarness(),
        script: eunomioSeedSimScript,
        seed: 7,
      }),
    );

    expect(terminal.status).toBe("fixpoint");
    expect(isRunFixpoint(terminal)).toBe(true);
    expect([...(terminal.pools[ids.partition]?.done ?? [])].sort()).toEqual(
      [...allEdgeIds].sort(),
    );
    expect(Object.keys(terminal.cursors)).toHaveLength(0);
  });
});
