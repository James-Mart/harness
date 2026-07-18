import { describe, expect, it } from "vitest";

import {
  harnessToFlowEdges,
  harnessToFlowNodes,
} from "@/components/canvas/harnessToFlow";
import { FLOW_LAYOUT } from "@/components/canvas/layoutTokens";
import {
  CURRENT_ITEM_PORT_ID,
  EXEC_IN_HANDLE,
  EXEC_OUT_HANDLE,
  createBaseSeedHarness,
  createBranchingSeedHarness,
  dataEdgeId,
  execEdgeId,
  execOutHandleId,
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
    expect(source?.data.execOutBranches).toEqual([undefined]);
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
    expect(loop?.data.execOutBranches).toEqual([undefined]);
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

  it("maps branching seed gate outs from wired exec edges", () => {
    const harness = createBranchingSeedHarness();
    const nodes = harnessToFlowNodes(harness);
    const gate = nodes.find((node) => node.id === "gate");
    expect(gate?.type).toBe("leaf");
    expect(gate?.data.execOutBranches).toEqual(["ok", "deny"]);
    if (gate?.type === "leaf") {
      expect(gate.data.isGate).toBe(true);
    }
  });
});

describe("harnessToFlowEdges", () => {
  it("maps seeded data wires to bezier flow edges with stable ids", () => {
    const harness = createBaseSeedHarness();
    const edges = harnessToFlowEdges(harness);
    const dataEdges = edges.filter((edge) => edge.data?.kind === "data");
    expect(dataEdges).toHaveLength(2);
    expect(dataEdges.map((edge) => edge.id).sort()).toEqual(
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

  it("maps exec edges as arrowed control lines distinct from data wires", () => {
    const harness = createBranchingSeedHarness();
    const edges = harnessToFlowEdges(harness);
    const execEdges = edges.filter((edge) => edge.data?.kind === "exec");
    expect(execEdges).toHaveLength(5);

    const sequential = execEdges.find(
      (edge) => edge.id === "exec:source->loop",
    );
    expect(sequential).toMatchObject({
      source: "source",
      sourceHandle: EXEC_OUT_HANDLE,
      target: "loop",
      targetHandle: EXEC_IN_HANDLE,
      type: "smoothstep",
    });
    expect(sequential?.markerEnd).toBeTruthy();
    expect(sequential?.label).toBeUndefined();

    const ok = execEdges.find(
      (edge) => edge.id === execEdgeId("gate", "onOk", "ok"),
    );
    expect(ok).toMatchObject({
      source: "gate",
      sourceHandle: execOutHandleId("ok"),
      target: "onOk",
      targetHandle: EXEC_IN_HANDLE,
      label: "ok",
      data: { kind: "exec", branch: "ok" },
    });
    expect(ok?.markerEnd).toBeTruthy();
  });
});
