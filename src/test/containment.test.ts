import { describe, expect, it } from "vitest";

import { resolveContainmentParent } from "@/authoring/containment";
import { harnessRootFlowNodes } from "@/authoring/flowGeometry";
import { persistHarnessRootLayout } from "@/authoring/layoutPersistence";
import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import { isAncestorOf } from "@/model/ancestry";
import {
  addCatalogNode,
  createBaseSeedHarness,
  reparentNode,
  setNodePosition,
  setNodePositions,
} from "@/model";
import { isUnder } from "@/model/reparent";
import {
  cycleAvoidanceNodes,
  deepestContainerNodes,
  nestSourceIntoLoopNodes,
  unnestWorkerOntoHarnessNodes,
} from "@/test/containmentFixtures";

describe("reparentNode", () => {
  it("nests a top-level node into a container", () => {
    const harness = createBaseSeedHarness();
    const next = reparentNode(harness, "source", "loop");
    expect(next.nodes.find((node) => node.id === "source")?.parentId).toBe(
      "loop",
    );
  });

  it("clears persisted position when nesting into a container", () => {
    const placed = addCatalogNode(createBaseSeedHarness(), "gate", {
      position: { x: 400, y: 200 },
    });
    const nested = reparentNode(placed, "gate-1", "loop");
    const gate = nested.nodes.find((node) => node.id === "gate-1");
    expect(gate?.parentId).toBe("loop");
    expect(gate?.position).toBeUndefined();
  });

  it("strips a stale position when parent is already nested", () => {
    const nested = reparentNode(createBaseSeedHarness(), "source", "loop");
    const stale = {
      ...nested,
      nodes: nested.nodes.map((node) =>
        node.id === "source" ? { ...node, position: { x: 10, y: 20 } } : node,
      ),
    };
    const cleaned = reparentNode(stale, "source", "loop");
    expect(
      cleaned.nodes.find((node) => node.id === "source")?.position,
    ).toBeUndefined();
  });

  it("un-nests a child to the harness top level", () => {
    const harness = createBaseSeedHarness();
    const next = reparentNode(harness, "worker", undefined);
    expect(
      next.nodes.find((node) => node.id === "worker")?.parentId,
    ).toBeUndefined();
  });

  it("rejects parenting into a leaf", () => {
    const harness = createBaseSeedHarness();
    const next = reparentNode(harness, "worker", "source");
    expect(next).toBe(harness);
  });

  it("rejects cycles when parenting into a descendant", () => {
    const harness = createBaseSeedHarness();
    const nested = reparentNode(harness, "source", "loop");
    const next = reparentNode(nested, "loop", "source");
    expect(next).toBe(nested);
  });

  it("no-ops when the parent is unchanged", () => {
    const harness = createBaseSeedHarness();
    expect(reparentNode(harness, "worker", "loop")).toBe(harness);
    expect(reparentNode(harness, "source", undefined)).toBe(harness);
  });

  it("reports ancestry with isUnder", () => {
    const harness = createBaseSeedHarness();
    expect(isUnder(harness, "loop", "worker")).toBe(true);
    expect(isUnder(harness, "worker", "loop")).toBe(false);
    expect(isUnder(harness, "loop", "loop")).toBe(true);
  });
  it("persists top-level position and clears it when nested", () => {
    const placed = setNodePosition(createBaseSeedHarness(), "source", {
      x: 120,
      y: 80,
    });
    expect(placed.nodes.find((node) => node.id === "source")?.position).toEqual(
      { x: 120, y: 80 },
    );

    const nested = reparentNode(placed, "source", "loop");
    // reparent clears; setNodePosition also refuses nested writes
    expect(
      setNodePosition(nested, "source", { x: 1, y: 2 }).nodes.find(
        (node) => node.id === "source",
      )?.position,
    ).toBeUndefined();
  });

  it("setNodePositions writes multiple roots in one pass", () => {
    const next = setNodePositions(
      createBaseSeedHarness(),
      new Map([
        ["source", { x: 10, y: 20 }],
        ["loop", { x: 300, y: 40 }],
      ]),
    );
    expect(next.nodes.find((node) => node.id === "source")?.position).toEqual({
      x: 10,
      y: 20,
    });
    expect(next.nodes.find((node) => node.id === "loop")?.position).toEqual({
      x: 300,
      y: 40,
    });
    expect(
      next.nodes.find((node) => node.id === "worker")?.position,
    ).toBeUndefined();
  });
});

describe("persistHarnessRootLayout", () => {
  it("freezes every harness-root position from flow geometry", () => {
    const geometry = harnessToFlowNodes(createBaseSeedHarness());
    const roots = harnessRootFlowNodes(geometry);
    expect(roots.map((node) => node.id).sort()).toEqual(["loop", "source"]);

    const next = persistHarnessRootLayout(
      createBaseSeedHarness(),
      geometry,
      "source",
    );
    for (const root of roots) {
      expect(next.nodes.find((node) => node.id === root.id)?.position).toEqual(
        root.position,
      );
    }
  });

  it("includes an un-nesting node whose draft parent is still a container", () => {
    // Fixture keeps worker.parentId === "loop" while resolving a top-level drop.
    const draft = unnestWorkerOntoHarnessNodes();
    const harness = reparentNode(createBaseSeedHarness(), "worker", undefined);
    const next = persistHarnessRootLayout(harness, draft, "worker");
    expect(next.nodes.find((node) => node.id === "worker")?.position).toEqual({
      x: -180,
      y: 40,
    });
    expect(next.nodes.find((node) => node.id === "loop")?.position).toEqual({
      x: 200,
      y: 40,
    });
  });
});

describe("isAncestorOf", () => {
  it("returns false on a corrupt cyclic parent chain", () => {
    const parents: Record<string, string | undefined> = {
      a: "b",
      b: "a",
    };
    expect(isAncestorOf((id) => parents[id], "z", "a")).toBe(false);
  });
});

describe("resolveContainmentParent", () => {
  it("detects a drop into a container body from absolute geometry", () => {
    expect(resolveContainmentParent("source", nestSourceIntoLoopNodes())).toBe(
      "loop",
    );
  });

  it("un-nests when the drop center hits only the open canvas", () => {
    expect(
      resolveContainmentParent("worker", unnestWorkerOntoHarnessNodes()),
    ).toBeUndefined();
  });

  it("picks the deepest intersecting container", () => {
    expect(resolveContainmentParent("leaf", deepestContainerNodes())).toBe(
      "inner",
    );
  });

  it("ignores descendant containers to avoid cycles", () => {
    expect(
      resolveContainmentParent("outer", cycleAvoidanceNodes()),
    ).toBeUndefined();
  });

  it("round-trips seed layout: worker stays under loop when unmoved", () => {
    const harness = createBaseSeedHarness();
    const nodes = harnessToFlowNodes(harness);
    expect(resolveContainmentParent("worker", nodes)).toBe("loop");
    expect(resolveContainmentParent("source", nodes)).toBeUndefined();
    expect(resolveContainmentParent("loop", nodes)).toBeUndefined();
  });

  it("commits nest geometry through resolve + reparent", () => {
    const harness = createBaseSeedHarness();
    const parentId = resolveContainmentParent(
      "source",
      nestSourceIntoLoopNodes(),
    );
    const next = reparentNode(harness, "source", parentId);
    expect(next.nodes.find((node) => node.id === "source")?.parentId).toBe(
      "loop",
    );
  });
});
