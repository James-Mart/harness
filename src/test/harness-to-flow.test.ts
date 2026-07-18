import { describe, expect, it } from "vitest";

import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import { FLOW_LAYOUT } from "@/components/canvas/layoutTokens";
import { createBaseSeedHarness } from "@/model";

describe("harnessToFlowNodes", () => {
  it("maps the base seed with containment and layout tokens", () => {
    const nodes = harnessToFlowNodes(createBaseSeedHarness());

    expect(nodes.map((node) => node.id)).toEqual(["source", "loop", "worker"]);

    const source = nodes.find((node) => node.id === "source");
    const loop = nodes.find((node) => node.id === "loop");
    const worker = nodes.find((node) => node.id === "worker");

    expect(source?.type).toBe("leaf");
    expect(source?.parentId).toBeUndefined();
    expect(source?.data).toEqual({
      title: "List source",
      catalogType: "listSource",
    });

    expect(loop?.type).toBe("container");
    expect(loop?.parentId).toBeUndefined();
    expect(loop?.data).toEqual({
      title: "For each",
      catalogType: "foreach",
      iterablePortId: "items",
      sourceKind: "snapshot",
    });
    expect(loop?.style?.width).toBeGreaterThan(0);
    expect(loop?.style?.height).toBeGreaterThan(0);

    expect(worker?.type).toBe("leaf");
    expect(worker?.parentId).toBe("loop");
    expect(worker?.extent).toBe("parent");
    expect(worker?.data).toEqual({
      title: "Implementor",
      catalogType: "implementor",
    });
    expect(worker?.position).toEqual({
      x: FLOW_LAYOUT.containerPadX,
      y: FLOW_LAYOUT.containerHeaderHeight + FLOW_LAYOUT.containerPadY,
    });
  });
});
