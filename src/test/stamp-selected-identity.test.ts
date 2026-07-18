import type { Edge } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import { stampSelectedPreservingIdentity } from "@/authoring/useCanvasSelection";
import type { HarnessFlowNode } from "@/components/canvas/flowTypes";

describe("stampSelectedPreservingIdentity", () => {
  it("preserves node identity when the selected flag is unchanged", () => {
    const a = { id: "a", position: { x: 0, y: 0 }, data: {} } as HarnessFlowNode;
    const b = {
      id: "b",
      position: { x: 1, y: 1 },
      data: {},
      selected: true,
    } as HarnessFlowNode;
    const nodes = [a, b];

    const next = stampSelectedPreservingIdentity(nodes, ["b"]);

    expect(next[0]).toBe(a);
    expect(next[1]).toBe(b);
    expect(next).toBe(nodes);
  });

  it("preserves edge identity when the selected flag is unchanged", () => {
    const e1 = { id: "e1", source: "a", target: "b" } as Edge;
    const e2 = {
      id: "e2",
      source: "b",
      target: "c",
      selected: true,
    } as Edge;
    const edges = [e1, e2];

    const next = stampSelectedPreservingIdentity(edges, ["e2"]);

    expect(next[0]).toBe(e1);
    expect(next[1]).toBe(e2);
    expect(next).toBe(edges);
  });

  it("allocates only for items whose selected flag flips", () => {
    const a = { id: "a", position: { x: 0, y: 0 }, data: {} } as HarnessFlowNode;
    const b = { id: "b", position: { x: 1, y: 1 }, data: {} } as HarnessFlowNode;

    const next = stampSelectedPreservingIdentity([a, b], ["a"]);

    expect(next[0]).not.toBe(a);
    expect(next[0]?.selected).toBe(true);
    expect(next[1]).toBe(b);
  });
});
