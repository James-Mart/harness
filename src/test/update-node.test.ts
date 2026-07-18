import { describe, expect, it } from "vitest";

import {
  addCatalogNode,
  createBaseSeedHarness,
  createWorkPoolSeedHarness,
  updateNode,
} from "@/model";

describe("updateNode", () => {
  it("renames a node's title", () => {
    const harness = createBaseSeedHarness();
    const next = updateNode(harness, "worker", {
      field: "title",
      value: "Builder",
    });
    expect(next.nodes.find((node) => node.id === "worker")?.title).toBe(
      "Builder",
    );
  });

  it("returns the same reference when nothing changes", () => {
    const harness = createBaseSeedHarness();
    const worker = harness.nodes.find((node) => node.id === "worker");
    const next = updateNode(harness, "worker", {
      field: "title",
      value: worker!.title,
    });
    expect(next).toBe(harness);
  });

  it("sets container concurrency kind and max concurrency", () => {
    const harness = createBaseSeedHarness();
    const parallel = updateNode(harness, "loop", {
      field: "concurrencyKind",
      value: "parallel",
    });
    const withMax = updateNode(parallel, "loop", {
      field: "maxConcurrency",
      value: "3",
    });
    const loop = withMax.nodes.find((node) => node.id === "loop");
    expect(loop?.kind === "container" && loop.concurrency).toEqual({
      kind: "parallel",
      maxConcurrency: 3,
    });
  });

  it("parses empty max concurrency as unlimited", () => {
    const harness = updateNode(createBaseSeedHarness(), "loop", {
      field: "concurrencyKind",
      value: "parallel",
    });
    const capped = updateNode(harness, "loop", {
      field: "maxConcurrency",
      value: "4",
    });
    const cleared = updateNode(capped, "loop", {
      field: "maxConcurrency",
      value: "",
    });
    const loop = cleared.nodes.find((node) => node.id === "loop");
    expect(loop?.kind === "container" && loop.concurrency).toEqual({
      kind: "parallel",
    });
  });

  it("clears fixpoint end when the source leaves live", () => {
    const harness = createWorkPoolSeedHarness();
    const next = updateNode(harness, "pool", {
      field: "source",
      value: { kind: "snapshot" },
    });
    const pool = next.nodes.find((node) => node.id === "pool");
    expect(pool?.kind === "container" && pool.source.kind).toBe("snapshot");
    expect(pool?.kind === "container" && pool.end).toBeUndefined();
  });

  it("ignores a fixpoint end on a non-live source", () => {
    const harness = createBaseSeedHarness();
    const next = updateNode(harness, "loop", {
      field: "end",
      value: { kind: "fixpoint" },
    });
    const loop = next.nodes.find((node) => node.id === "loop");
    // Base seed `loop` is a snapshot foreach; fixpoint must not attach.
    expect(loop?.kind === "container" && loop.end).toBeUndefined();
  });

  it("sets and clears a leaf appendsTo", () => {
    const seeded = addCatalogNode(createWorkPoolSeedHarness(), "implementor");
    const withAppend = updateNode(seeded, "implementor-1", {
      field: "appendsTo",
      value: "pool",
    });
    const leaf = withAppend.nodes.find((node) => node.id === "implementor-1");
    expect(leaf?.kind === "leaf" && leaf.appendsTo).toBe("pool");

    const cleared = updateNode(withAppend, "implementor-1", {
      field: "appendsTo",
      value: undefined,
    });
    const clearedLeaf = cleared.nodes.find(
      (node) => node.id === "implementor-1",
    );
    expect(
      clearedLeaf?.kind === "leaf" && clearedLeaf.appendsTo,
    ).toBeUndefined();
  });
});
