import { describe, expect, it } from "vitest";

import { resolveContainmentParent } from "@/authoring/containment";
import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import { isAncestorOf } from "@/model/ancestry";
import { createBaseSeedHarness, reparentNode } from "@/model";
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

  it("un-nests when the drop center hits only the harness shell", () => {
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
