import { describe, expect, it } from "vitest";

import { execEdgeId } from "@/model/exec";
import {
  createBaseSeedHarness,
  createWorkPoolSeedHarness,
  removeEdges,
  removeNodes,
} from "@/model";
import { dataEdgeId } from "@/model/wiring";

describe("removeNodes", () => {
  it("removes a leaf and its incident data/exec edges", () => {
    const harness = createBaseSeedHarness();
    const next = removeNodes(harness, ["worker"]);

    expect(next.nodes.map((node) => node.id)).toEqual(["source", "loop"]);
    expect(
      next.edges.some(
        (edge) =>
          (edge.kind === "data" &&
            (edge.from.node === "worker" || edge.to.node === "worker")) ||
          (edge.kind === "exec" &&
            (edge.from === "worker" || edge.to === "worker")),
      ),
    ).toBe(false);
  });

  it("cascades into container descendants", () => {
    const harness = createBaseSeedHarness();
    const next = removeNodes(harness, ["loop"]);

    expect(next.nodes.map((node) => node.id)).toEqual(["source"]);
    expect(next.edges).toEqual([]);
  });

  it("clears appendsTo pointing at a removed container", () => {
    const harness = createWorkPoolSeedHarness();
    const next = removeNodes(harness, ["pool"]);

    expect(next.nodes.map((node) => node.id)).toEqual(["source"]);
    expect(
      next.nodes.every((node) => node.kind !== "leaf" || !node.appendsTo),
    ).toBe(true);
  });

  it("prunes run-config entries for removed nodes", () => {
    const harness = createBaseSeedHarness();
    harness.runConfig.perContainer.loop = { maxConcurrency: 2 };
    harness.runConfig.gates.worker = { enabled: false };

    const next = removeNodes(harness, ["loop"]);
    expect(next.runConfig.perContainer).toEqual({});
    expect(next.runConfig.gates).toEqual({});
  });

  it("no-ops for unknown ids", () => {
    const harness = createBaseSeedHarness();
    expect(removeNodes(harness, ["missing"])).toBe(harness);
  });
});

describe("removeEdges", () => {
  it("removes a data wire by flow id", () => {
    const harness = createBaseSeedHarness();
    const edgeId = dataEdgeId(
      { node: "source", port: "items" },
      { node: "loop", port: "items" },
    );
    const next = removeEdges(harness, [edgeId]);

    expect(
      next.edges.some(
        (edge) =>
          edge.kind === "data" &&
          edge.from.node === "source" &&
          edge.to.node === "loop",
      ),
    ).toBe(false);
    expect(next.nodes).toEqual(harness.nodes);
  });

  it("removes an exec edge by flow id", () => {
    const harness = createBaseSeedHarness();
    const next = removeEdges(harness, [execEdgeId("source", "loop")]);

    expect(
      next.edges.some(
        (edge) =>
          edge.kind === "exec" && edge.from === "source" && edge.to === "loop",
      ),
    ).toBe(false);
  });

  it("clears appendsTo when deleting an append edge", () => {
    const harness = createWorkPoolSeedHarness();
    const next = removeEdges(harness, ["append:fanOut->pool"]);
    const fanOut = next.nodes.find((node) => node.id === "fanOut");

    expect(fanOut?.kind).toBe("leaf");
    if (fanOut?.kind === "leaf") {
      expect(fanOut.appendsTo).toBeUndefined();
    }
    expect(next.edges).toEqual(harness.edges);
  });
});
