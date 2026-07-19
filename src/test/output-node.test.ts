import { describe, expect, it } from "vitest";

import { assertLayoutInvariants } from "@/authoring/layoutInvariants";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import {
  bodyHelperNodeId,
  harnessToFlowEdges,
  harnessToFlowNodes,
  outputPortsForContainer,
  outputPortsForHarness,
} from "@/components/canvas/harnessToFlow";
import {
  FLOW_LAYOUT,
  bodyBottomStripOrigin,
  bodyChildrenOriginY,
  containerChromeHeaderHeight,
} from "@/components/canvas/layoutTokens";
import {
  CURRENT_ITEM_PORT_ID,
  createBaseSeedHarness,
  instantiateFromCatalog,
  mockSchema,
  type ContainerNode,
  type Harness,
  type Port,
} from "@/model";

/** Base seed + a payload out on `loop` written by `worker`. */
function harnessWithContainerOutput(): {
  harness: Harness;
  resultPort: Port;
} {
  const base = createBaseSeedHarness();
  const loop = base.nodes.find((node) => node.id === "loop");
  if (loop?.kind !== "container") throw new Error("expected loop container");

  const resultPort: Port = {
    id: "result",
    name: "result",
    direction: "out",
    schema: mockSchema("string"),
  };
  const withOut: ContainerNode = {
    ...loop,
    ports: [...loop.ports, resultPort],
  };
  const worker = base.nodes.find((node) => node.id === "worker");
  if (worker?.kind !== "leaf") throw new Error("expected worker leaf");

  // Worker gains a matching out so the model edge is well-formed.
  const workerOut: Port = {
    id: "text",
    name: "text",
    direction: "out",
    schema: mockSchema("string"),
  };
  const workerWithOut = {
    ...worker,
    ports: [...worker.ports, workerOut],
  };

  const harness: Harness = {
    ...base,
    nodes: base.nodes.map((node) => {
      if (node.id === "loop") return withOut;
      if (node.id === "worker") return workerWithOut;
      return node;
    }),
    edges: [
      ...base.edges,
      {
        kind: "data",
        from: { node: "worker", port: "text" },
        to: { node: "loop", port: "result" },
      },
    ],
  };

  return { harness, resultPort };
}

describe("Output node", () => {
  it("surfaces a container payload out as an Output input; child wire terminates there", () => {
    const { harness, resultPort } = harnessWithContainerOutput();
    const loop = harness.nodes.find((node) => node.id === "loop");
    if (loop?.kind !== "container") throw new Error("expected loop");

    expect(outputPortsForContainer(loop).map((port) => port.id)).toEqual([
      "result",
    ]);
    expect(outputPortsForContainer(loop)[0]).toMatchObject({
      direction: "in",
      schema: mockSchema("string"),
      name: "result",
    });

    const nodes = harnessToFlowNodes(harness);
    const edges = harnessToFlowEdges(harness);
    assertLayoutInvariants(nodes);

    const output = nodes.find(
      (node) => node.id === bodyHelperNodeId("loop", "output"),
    );
    expect(output).toMatchObject({
      type: "helper",
      parentId: "loop",
      draggable: false,
      deletable: false,
      selectable: false,
      data: {
        kind: "output",
        title: "Output",
        ports: [{ id: "result", direction: "in" }],
      },
    });

    const container = nodes.find((node) => node.id === "loop");
    expect(container?.type).toBe("container");
    if (container?.type !== "container") {
      throw new Error("expected loop container flow node");
    }
    // Payload out stays on outer chrome (siblings read it); Output is the sink.
    expect(container.data.ports.some((port) => port.id === "result")).toBe(
      true,
    );
    expect(
      container.data.ports.some((port) => port.id === CURRENT_ITEM_PORT_ID),
    ).toBe(false);

    const sinkEdge = edges.find(
      (edge) =>
        edge.data?.kind === "data" &&
        edge.source === "worker" &&
        edge.sourceHandle === "text" &&
        edge.targetHandle === resultPort.id,
    );
    expect(sinkEdge).toMatchObject({
      target: bodyHelperNodeId("loop", "output"),
      targetHandle: "result",
    });
  });

  it("places Output in the bottom strip below children", () => {
    const { harness } = harnessWithContainerOutput();
    const nodes = harnessToFlowNodes(harness);
    assertLayoutInvariants(nodes);

    const worker = nodes.find((node) => node.id === "worker");
    const output = nodes.find(
      (node) => node.id === bodyHelperNodeId("loop", "output"),
    );
    expect(worker).toBeDefined();
    expect(output).toBeDefined();

    const header = containerChromeHeaderHeight();
    const workerHeight =
      typeof worker!.style?.height === "number" ? worker!.style.height : 0;
    expect(output!.position).toEqual(
      bodyBottomStripOrigin(
        header,
        workerHeight,
        FLOW_LAYOUT.bodyTopStripHeight,
        FLOW_LAYOUT.helperNodeHeight,
      ),
    );
    expect(output!.position.y).toBeGreaterThan(
      worker!.position.y + workerHeight,
    );
  });

  it("omits Output when a container has no payload outs", () => {
    const harness = createBaseSeedHarness();
    const loop = harness.nodes.find((node) => node.id === "loop");
    if (loop?.kind !== "container") throw new Error("expected loop");

    expect(outputPortsForContainer(loop)).toEqual([]);

    const nodes = harnessToFlowNodes(harness);
    assertLayoutInvariants(nodes);

    expect(
      nodes.find((node) => node.id === bodyHelperNodeId("loop", "output")),
    ).toBeUndefined();
  });

  it("does not treat $currentItem as an Output port", () => {
    const harness = createBaseSeedHarness();
    const loop = harness.nodes.find((node) => node.id === "loop");
    if (loop?.kind !== "container") throw new Error("expected loop");

    expect(
      loop.ports.some((port) => port.id === CURRENT_ITEM_PORT_ID),
    ).toBe(true);
    expect(outputPortsForContainer(loop)).toEqual([]);
  });

  it("emits canvas-level Output for harness boundary outs", () => {
    const harness = createBaseSeedHarness();
    expect(outputPortsForHarness(harness).map((port) => port.id)).toEqual([
      "summary",
    ]);

    const nodes = harnessToFlowNodes(harness);
    assertLayoutInvariants(nodes);

    const output = nodes.find(
      (node) =>
        node.id === bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "output"),
    );
    expect(output).toMatchObject({
      type: "helper",
      parentId: HARNESS_FLOW_NODE_ID,
      draggable: false,
      deletable: false,
      selectable: false,
      data: {
        kind: "output",
        title: "Output",
        ports: [{ id: "summary", direction: "in" }],
      },
    });

    // Below the auto-laid-out root row.
    expect(output!.position.y).toBeGreaterThan(
      bodyChildrenOriginY(FLOW_LAYOUT.harnessHeaderHeight),
    );
  });

  it("re-routes a root→harness-boundary out edge onto the canvas Output", () => {
    const base = createBaseSeedHarness();
    const summarizer = instantiateFromCatalog("gate", {
      id: "summarizer",
    });
    // Give the leaf an out matching the harness `summary` schema.
    const textOut: Port = {
      id: "text",
      name: "text",
      direction: "out",
      schema: mockSchema("string"),
    };
    const leaf = {
      ...summarizer,
      ports: [...summarizer.ports, textOut],
    };

    const harness: Harness = {
      ...base,
      nodes: [...base.nodes, leaf],
      edges: [
        ...base.edges,
        {
          kind: "data",
          from: { node: "summarizer", port: "text" },
          to: { node: HARNESS_FLOW_NODE_ID, port: "summary" },
        },
      ],
    };

    const edges = harnessToFlowEdges(harness);
    const nodes = harnessToFlowNodes(harness);
    assertLayoutInvariants(nodes);

    const sink = edges.find(
      (edge) =>
        edge.data?.kind === "data" &&
        edge.source === "summarizer" &&
        edge.sourceHandle === "text" &&
        edge.targetHandle === "summary",
    );
    expect(sink).toMatchObject({
      target: bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "output"),
    });
  });
});
