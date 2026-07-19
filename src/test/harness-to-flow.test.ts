import { describe, expect, it } from "vitest";

import {
  bodyHelperNodeId,
  harnessToFlowEdges,
  harnessToFlowNodes,
} from "@/components/canvas/harnessToFlow";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import {
  FLOW_LAYOUT,
  bodyChildrenOriginY,
  containerChromeHeaderHeight,
} from "@/components/canvas/layoutTokens";
import { appendEdgeId } from "@/model";
import {
  EXEC_IN_HANDLE,
  EXEC_OUT_HANDLE,
  createBaseSeedHarness,
  createBranchingSeedHarness,
  createWorkPoolSeedHarness,
  dataEdgeId,
  execEdgeId,
  execOutHandleId,
  updateRunConfig,
} from "@/model";

describe("harnessToFlowNodes", () => {
  it("maps the base seed with containment, ports, and layout tokens", () => {
    const harness = createBaseSeedHarness();
    const nodes = harnessToFlowNodes(harness);

    expect(nodes.map((node) => node.id)).toEqual([
      bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "exec"),
      bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "variables"),
      bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "output"),
      "source",
      "loop",
      bodyHelperNodeId("loop", "exec"),
      bodyHelperNodeId("loop", "variables"),
      "worker",
    ]);

    expect(
      nodes.find((node) => node.id === HARNESS_FLOW_NODE_ID),
    ).toBeUndefined();

    const source = nodes.find((node) => node.id === "source");
    const loop = nodes.find((node) => node.id === "loop");
    const worker = nodes.find((node) => node.id === "worker");
    const canvasVariables = nodes.find(
      (node) =>
        node.id === bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "variables"),
    );
    const canvasOutput = nodes.find(
      (node) => node.id === bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "output"),
    );

    expect(canvasVariables?.parentId).toBeUndefined();
    expect(canvasVariables).toMatchObject({
      type: "helper",
      data: {
        kind: "variables",
        title: "Variables",
        ports: [{ id: "tasks", direction: "out" }],
      },
    });
    expect(canvasOutput?.parentId).toBeUndefined();
    expect(canvasOutput).toMatchObject({
      type: "helper",
      data: {
        kind: "output",
        title: "Output",
        ports: [{ id: "summary", direction: "in" }],
      },
    });

    expect(source?.type).toBe("leaf");
    if (source?.type !== "leaf") throw new Error("expected leaf source");
    expect(source.parentId).toBeUndefined();
    expect(source.extent).toBeUndefined();
    expect(source.data.title).toBe("List source");
    expect(source.data.catalogType).toBe("listSource");
    expect(source.data.execOutBranches).toEqual([undefined]);
    expect(source.data.ports).toEqual(
      harness.nodes.find((node) => node.id === "source")!.ports,
    );
    expect(source.data.ports.map((port) => port.id)).toEqual(["items"]);
    expect(source.position).toEqual({
      x: FLOW_LAYOUT.containerPadX,
      y: bodyChildrenOriginY(0),
    });

    expect(loop?.type).toBe("container");
    if (loop?.type !== "container") throw new Error("expected container loop");
    expect(loop.parentId).toBeUndefined();
    expect(loop.extent).toBeUndefined();
    expect(loop.data).toMatchObject({
      title: "For each",
      catalogType: "foreach",
      iterablePortId: "items",
      sourceKind: "snapshot",
      concurrency: { kind: "sequential" },
      hasFanOut: false,
    });
    expect(loop.data.end).toBeUndefined();
    // Body-entry outs live on the Exec helper; loop has no sibling outs.
    expect(loop.data.execOutBranches).toEqual([]);
    expect(loop.data.ports.map((port) => port.id)).toEqual(["items"]);
    expect(loop.style?.width).toBeGreaterThan(0);
    expect(loop.style?.height).toBeGreaterThan(0);

    expect(worker?.type).toBe("leaf");
    if (worker?.type !== "leaf") throw new Error("expected leaf worker");
    expect(worker.parentId).toBe("loop");
    expect(worker.extent).toBeUndefined();
    expect(worker.data.title).toBe("Implementor");
    expect(worker.data.catalogType).toBe("implementor");
    expect(worker.data.ports.map((port) => port.id)).toEqual([
      "task",
      "result",
    ]);
    expect(worker.position).toEqual({
      x: FLOW_LAYOUT.containerPadX,
      y: bodyChildrenOriginY(containerChromeHeaderHeight()),
    });
    expect(worker.style?.height).toBeGreaterThan(FLOW_LAYOUT.leafMinHeight - 1);
  });

  it("maps branching seed gate outs from wired exec edges", () => {
    const harness = createBranchingSeedHarness();
    const nodes = harnessToFlowNodes(harness);
    const gate = nodes.find((node) => node.id === "gate");
    expect(gate?.type).toBe("leaf");
    if (gate?.type !== "leaf") throw new Error("expected leaf gate");
    expect(gate.data.execOutBranches).toEqual(["ok", "deny"]);
    expect(gate.data.isGate).toBe(true);
    expect(gate.data.gateEnabled).toBe(true);
  });

  it("maps run-config gate disable onto leaf flow data", () => {
    const harness = updateRunConfig(createBranchingSeedHarness(), {
      field: "gateEnabled",
      gateId: "gate",
      enabled: false,
    });
    const gate = harnessToFlowNodes(harness).find((node) => node.id === "gate");
    expect(gate?.type).toBe("leaf");
    if (gate?.type !== "leaf") throw new Error("expected leaf gate");
    expect(gate.data.isGate).toBe(true);
    expect(gate.data.gateEnabled).toBe(false);
  });

  it("maps work-pool concurrency, live source, fixpoint, and fan-out", () => {
    const harness = createWorkPoolSeedHarness();
    const nodes = harnessToFlowNodes(harness);
    const pool = nodes.find((node) => node.id === "pool");
    const fanOut = nodes.find((node) => node.id === "fanOut");

    expect(pool?.type).toBe("container");
    if (pool?.type !== "container") throw new Error("expected container pool");
    expect(pool.data).toMatchObject({
      catalogType: "workPool",
      sourceKind: "live",
      concurrency: { kind: "parallel", maxConcurrency: 4 },
      end: { kind: "fixpoint" },
      hasFanOut: true,
      advisoryCues: [],
    });

    expect(fanOut?.type).toBe("leaf");
    if (fanOut?.type !== "leaf") throw new Error("expected leaf fanOut");
    expect(fanOut.data.appendsTo).toBe("pool");
    expect(fanOut.data.appendsToTitle).toBe("Work pool");
    expect(fanOut.style?.height).toBeGreaterThan(
      FLOW_LAYOUT.leafMinHeight + FLOW_LAYOUT.leafFanOutMarkerHeight - 1,
    );
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

    const bodyEntry = execEdges.find((edge) => edge.id === "exec:loop->worker");
    expect(bodyEntry).toMatchObject({
      source: bodyHelperNodeId("loop", "exec"),
      sourceHandle: EXEC_OUT_HANDLE,
      target: "worker",
      targetHandle: EXEC_IN_HANDLE,
    });

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

  it("maps fan-out append relationships as dashed append edges", () => {
    const harness = createWorkPoolSeedHarness();
    const edges = harnessToFlowEdges(harness);
    const append = edges.find((edge) => edge.data?.kind === "append");
    expect(append).toMatchObject({
      id: appendEdgeId("fanOut", "pool"),
      source: "fanOut",
      target: "pool",
      label: "append",
      type: "smoothstep",
      data: { kind: "append" },
    });
    expect(append?.style).toMatchObject({ strokeDasharray: "5 4" });
  });
});
