import { describe, expect, it } from "vitest";

import {
  harnessToFlowEdges,
  harnessToFlowNodes,
} from "@/components/canvas/harnessToFlow";
import { FLOW_LAYOUT } from "@/components/canvas/layoutTokens";
import {
  CURRENT_ITEM_PORT_ID,
  createBaseSeedHarness,
  dataEdgeId,
  mockSchema,
} from "@/model";

describe("harnessToFlowNodes", () => {
  it("maps the base seed with containment, ports, and layout tokens", () => {
    const harness = createBaseSeedHarness();
    const nodes = harnessToFlowNodes(harness);

    expect(nodes.map((node) => node.id)).toEqual(["source", "loop", "worker"]);

    const source = nodes.find((node) => node.id === "source");
    const loop = nodes.find((node) => node.id === "loop");
    const worker = nodes.find((node) => node.id === "worker");

    expect(source?.type).toBe("leaf");
    expect(source?.parentId).toBeUndefined();
    expect(source?.data.title).toBe("List source");
    expect(source?.data.catalogType).toBe("listSource");
    expect(source?.data.ports).toEqual(
      harness.nodes.find((node) => node.id === "source")!.ports,
    );
    expect(source?.data.ports.map((port) => port.id)).toEqual(["items"]);

    expect(loop?.type).toBe("container");
    expect(loop?.parentId).toBeUndefined();
    expect(loop?.data).toMatchObject({
      title: "For each",
      catalogType: "foreach",
      iterablePortId: "items",
      sourceKind: "snapshot",
    });
    expect(loop?.data.ports.map((port) => port.id)).toEqual([
      "items",
      CURRENT_ITEM_PORT_ID,
    ]);
    expect(
      loop?.data.ports.find((port) => port.id === CURRENT_ITEM_PORT_ID)?.schema,
    ).toEqual(mockSchema("task"));
    expect(loop?.style?.width).toBeGreaterThan(0);
    expect(loop?.style?.height).toBeGreaterThan(0);

    expect(worker?.type).toBe("leaf");
    expect(worker?.parentId).toBe("loop");
    expect(worker?.extent).toBe("parent");
    expect(worker?.data.title).toBe("Implementor");
    expect(worker?.data.catalogType).toBe("implementor");
    expect(worker?.data.ports.map((port) => port.id)).toEqual([
      "task",
      "result",
    ]);
    expect(worker?.position).toEqual({
      x: FLOW_LAYOUT.containerPadX,
      y: FLOW_LAYOUT.containerHeaderHeight + FLOW_LAYOUT.containerPadY,
    });
    expect(worker?.style?.height).toBeGreaterThan(
      FLOW_LAYOUT.leafMinHeight - 1,
    );
  });
});

describe("harnessToFlowEdges", () => {
  it("maps seeded data wires to bezier flow edges with stable ids", () => {
    const harness = createBaseSeedHarness();
    const edges = harnessToFlowEdges(harness);
    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => edge.id).sort()).toEqual(
      [
        "data:loop/$currentItem->worker/task",
        "data:source/items->loop/items",
      ].sort(),
    );

    const items = edges.find(
      (edge) =>
        edge.source === "source" &&
        edge.sourceHandle === "items" &&
        edge.target === "loop",
    );
    expect(items?.id).toBe(
      dataEdgeId(
        { node: "source", port: "items" },
        { node: "loop", port: "items" },
      ),
    );
    expect(items?.type).toBe("default");
    expect(items?.style).toMatchObject({ strokeWidth: 2 });
  });
});
