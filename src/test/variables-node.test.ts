import { describe, expect, it } from "vitest";

import { assertLayoutInvariants } from "@/authoring/layoutInvariants";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import {
  bodyHelperNodeId,
  harnessToFlowEdges,
  harnessToFlowNodes,
  variablesPortsForContainer,
  variablesPortsForHarness,
} from "@/components/canvas/harnessToFlow";
import {
  CURRENT_ITEM_PORT_ID,
  createBaseSeedHarness,
  createEunomioSeedHarness,
  createTrackerSeedHarness,
  instantiateFromCatalog,
  mockSchema,
  type ContainerNode,
  type Harness,
  type Port,
} from "@/model";
import { containerIds } from "@/test/harnessTestUtils";

describe("Variables node ($currentItem)", () => {
  it.each([
    ["tracker", createTrackerSeedHarness] as const,
    ["eunomio", createEunomioSeedHarness] as const,
  ])(
    "%s: $currentItem data edges source from Variables; no outer port",
    (_name, create) => {
      const harness = create();
      const nodes = harnessToFlowNodes(harness);
      const edges = harnessToFlowEdges(harness);
      assertLayoutInvariants(nodes);

      // Canvas-level Variables surfaces harness boundary inputs.
      const canvasVariablesPorts = variablesPortsForHarness(harness);
      expect(canvasVariablesPorts.length).toBeGreaterThan(0);
      const canvasVariables = nodes.find(
        (node) =>
          node.id === bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "variables"),
      );
      expect(canvasVariables?.parentId).toBeUndefined();
      expect(canvasVariables).toMatchObject({
        type: "helper",
        data: {
          kind: "variables",
          title: "Variables",
          ports: canvasVariablesPorts,
        },
      });

      for (const containerId of containerIds(harness)) {
        const model = harness.nodes.find((node) => node.id === containerId);
        expect(model?.kind).toBe("container");
        if (model?.kind !== "container") {
          throw new Error(`expected container ${containerId}`);
        }

        const variablesPorts = variablesPortsForContainer(model);
        expect(variablesPorts.map((port) => port.id)).toEqual([
          CURRENT_ITEM_PORT_ID,
        ]);

        const variables = nodes.find(
          (node) => node.id === bodyHelperNodeId(containerId, "variables"),
        );
        expect(variables).toMatchObject({
          type: "helper",
          parentId: containerId,
          draggable: false,
          deletable: false,
          selectable: false,
          data: {
            kind: "variables",
            title: "Variables",
            ports: variablesPorts,
          },
        });

        const container = nodes.find((node) => node.id === containerId);
        expect(container?.type).toBe("container");
        if (container?.type !== "container") {
          throw new Error(`expected container flow node ${containerId}`);
        }
        expect(
          container.data.ports.some((port) => port.id === CURRENT_ITEM_PORT_ID),
        ).toBe(false);
      }

      const currentItemModelEdges = harness.edges.filter(
        (edge) =>
          edge.kind === "data" && edge.from.port === CURRENT_ITEM_PORT_ID,
      );
      expect(currentItemModelEdges.length).toBeGreaterThan(0);

      for (const edge of currentItemModelEdges) {
        const flow = edges.find(
          (entry) =>
            entry.data?.kind === "data" &&
            entry.target === edge.to.node &&
            entry.targetHandle === edge.to.port &&
            entry.sourceHandle === CURRENT_ITEM_PORT_ID,
        );
        expect(flow).toMatchObject({
          source: bodyHelperNodeId(edge.from.node, "variables"),
          sourceHandle: CURRENT_ITEM_PORT_ID,
        });
      }
    },
  );

  it("omits Variables when a container has no readable values", () => {
    const base = createBaseSeedHarness();
    const loop = base.nodes.find((node) => node.id === "loop");
    if (loop?.kind !== "container") throw new Error("expected loop container");

    const nonIterating: ContainerNode = {
      ...loop,
      id: "plain",
      title: "Non-iterating",
      // No `$currentItem` and no pass-through inputs (only iterable feedstock
      // remains) — Variables stays omitted.
      ports: loop.ports.filter((port) => port.id !== CURRENT_ITEM_PORT_ID),
    };

    const harness: Harness = {
      ...base,
      nodes: [
        ...base.nodes.filter(
          (node) => node.id !== "loop" && node.parentId !== "loop",
        ),
        nonIterating,
      ],
      // Keep a stale `$currentItem` edge — must not invent a Variables source.
      edges: [
        ...base.edges.filter(
          (edge) =>
            !(
              (edge.kind === "data" || edge.kind === "exec") &&
              (edge.kind === "exec"
                ? edge.from === "loop" || edge.to === "loop"
                : edge.from.node === "loop" ||
                  edge.to.node === "loop" ||
                  edge.from.node === "worker" ||
                  edge.to.node === "worker")
            ),
        ),
        {
          kind: "data",
          from: { node: "plain", port: CURRENT_ITEM_PORT_ID },
          to: { node: "source", port: "items" },
        },
      ],
    };

    const nodes = harnessToFlowNodes(harness);
    const edges = harnessToFlowEdges(harness);
    assertLayoutInvariants(nodes);

    expect(variablesPortsForContainer(nonIterating)).toEqual([]);
    expect(
      nodes.find((node) => node.id === bodyHelperNodeId("plain", "variables")),
    ).toBeUndefined();

    const plain = nodes.find((node) => node.id === "plain");
    expect(plain?.type).toBe("container");
    if (plain?.type !== "container")
      throw new Error("expected plain container");
    expect(
      plain.data.ports.some((port) => port.id === CURRENT_ITEM_PORT_ID),
    ).toBe(false);

    const stale = edges.find(
      (edge) =>
        edge.data?.kind === "data" &&
        edge.sourceHandle === CURRENT_ITEM_PORT_ID &&
        edge.target === "source",
    );
    expect(stale).toMatchObject({
      source: "plain",
      sourceHandle: CURRENT_ITEM_PORT_ID,
    });
  });

  it("places Variables beside Exec in the top strip on the base seed", () => {
    const harness = createBaseSeedHarness();
    const nodes = harnessToFlowNodes(harness);
    assertLayoutInvariants(nodes);

    const exec = nodes.find(
      (node) => node.id === bodyHelperNodeId("loop", "exec"),
    );
    const variables = nodes.find(
      (node) => node.id === bodyHelperNodeId("loop", "variables"),
    );
    expect(exec).toBeDefined();
    expect(variables).toBeDefined();
    expect(variables!.position.y).toBe(exec!.position.y);
    expect(variables!.position.x).toBeGreaterThan(
      exec!.position.x +
        (typeof exec!.style?.width === "number" ? exec!.style.width : 0),
    );
    expect(variables!.data.ports[0]?.schema).toEqual(mockSchema("task"));
  });
});

describe("Variables node (pass-through inputs)", () => {
  it("surfaces an extra container input as a Variables output; body wires originate there", () => {
    const base = createBaseSeedHarness();
    const loop = base.nodes.find((node) => node.id === "loop");
    if (loop?.kind !== "container") throw new Error("expected loop container");

    const contextPort: Port = {
      id: "context",
      name: "context",
      direction: "in",
      schema: mockSchema("string"),
      required: true,
    };
    // Declaration order: iterable, pass-through, then `$currentItem`.
    const items = loop.ports.find((port) => port.id === loop.iterablePortId);
    const currentItem = loop.ports.find(
      (port) => port.id === CURRENT_ITEM_PORT_ID,
    );
    if (!items || !currentItem) throw new Error("expected loop ports");

    const withContext: ContainerNode = {
      ...loop,
      ports: [items, contextPort, currentItem],
    };
    const gate = instantiateFromCatalog("gate", {
      id: "gate",
      parentId: "loop",
    });

    const harness: Harness = {
      ...base,
      nodes: [
        ...base.nodes.map((node) => (node.id === "loop" ? withContext : node)),
        gate,
      ],
      edges: [
        ...base.edges,
        {
          kind: "data",
          from: { node: "loop", port: "context" },
          to: { node: "gate", port: "prompt" },
        },
        { kind: "exec", from: "worker", to: "gate" },
      ],
    };

    expect(variablesPortsForContainer(withContext).map((port) => port.id)).toEqual([
      CURRENT_ITEM_PORT_ID,
      "context",
    ]);
    expect(
      variablesPortsForContainer(withContext).find(
        (port) => port.id === "context",
      ),
    ).toMatchObject({
      direction: "out",
      schema: mockSchema("string"),
    });

    const nodes = harnessToFlowNodes(harness);
    const edges = harnessToFlowEdges(harness);
    assertLayoutInvariants(nodes);

    const variables = nodes.find(
      (node) => node.id === bodyHelperNodeId("loop", "variables"),
    );
    expect(variables?.data.ports.map((port) => port.id)).toEqual([
      CURRENT_ITEM_PORT_ID,
      "context",
    ]);

    const container = nodes.find((node) => node.id === "loop");
    expect(container?.type).toBe("container");
    if (container?.type !== "container") {
      throw new Error("expected loop container flow node");
    }
    // Pass-through stays on outer chrome (sibling → container); Variables is
    // the inner source. `$currentItem` remains body-only.
    expect(container.data.ports.map((port) => port.id)).toEqual([
      "items",
      "context",
    ]);

    const passThrough = edges.find(
      (edge) =>
        edge.data?.kind === "data" &&
        edge.target === "gate" &&
        edge.targetHandle === "prompt",
    );
    expect(passThrough).toMatchObject({
      source: bodyHelperNodeId("loop", "variables"),
      sourceHandle: "context",
    });

    const currentItemEdge = edges.find(
      (edge) =>
        edge.data?.kind === "data" &&
        edge.target === "worker" &&
        edge.targetHandle === "task",
    );
    expect(currentItemEdge).toMatchObject({
      source: bodyHelperNodeId("loop", "variables"),
      sourceHandle: CURRENT_ITEM_PORT_ID,
    });
  });

  it("orders $currentItem first, then pass-through inputs in declaration order", () => {
    const base = createBaseSeedHarness();
    const loop = base.nodes.find((node) => node.id === "loop");
    if (loop?.kind !== "container") throw new Error("expected loop container");

    const items = loop.ports.find((port) => port.id === loop.iterablePortId);
    const currentItem = loop.ports.find(
      (port) => port.id === CURRENT_ITEM_PORT_ID,
    );
    if (!items || !currentItem) throw new Error("expected loop ports");

    const alpha: Port = {
      id: "alpha",
      name: "alpha",
      direction: "in",
      schema: mockSchema("string"),
    };
    const beta: Port = {
      id: "beta",
      name: "beta",
      direction: "in",
      schema: mockSchema("boolean"),
    };
    // `$currentItem` sits between the two pass-throughs in declaration order;
    // Variables must still emit it first, then alpha/beta as declared.
    const withExtras: ContainerNode = {
      ...loop,
      ports: [items, alpha, currentItem, beta],
    };

    expect(variablesPortsForContainer(withExtras).map((port) => port.id)).toEqual([
      CURRENT_ITEM_PORT_ID,
      "alpha",
      "beta",
    ]);

    const nodes = harnessToFlowNodes({
      ...base,
      nodes: base.nodes.map((node) =>
        node.id === "loop" ? withExtras : node,
      ),
    });
    assertLayoutInvariants(nodes);

    const variables = nodes.find(
      (node) => node.id === bodyHelperNodeId("loop", "variables"),
    );
    expect(variables?.data.ports.map((port) => port.id)).toEqual([
      CURRENT_ITEM_PORT_ID,
      "alpha",
      "beta",
    ]);
  });

  it("emits Variables for a non-iterating container that has only pass-through inputs", () => {
    const base = createBaseSeedHarness();
    const loop = base.nodes.find((node) => node.id === "loop");
    if (loop?.kind !== "container") throw new Error("expected loop container");

    const contextPort: Port = {
      id: "context",
      name: "context",
      direction: "in",
      schema: mockSchema("string"),
      required: true,
    };
    const plain: ContainerNode = {
      ...loop,
      id: "plain",
      title: "Pass-through only",
      // No `$currentItem`; pass-through alone is enough to emit Variables.
      ports: [contextPort],
      iterablePortId: "items",
    };
    const gate = instantiateFromCatalog("gate", {
      id: "gate",
      parentId: "plain",
    });

    const harness: Harness = {
      ...base,
      nodes: [
        ...base.nodes.filter(
          (node) => node.id !== "loop" && node.parentId !== "loop",
        ),
        plain,
        gate,
      ],
      edges: [
        ...base.edges.filter(
          (edge) =>
            !(
              (edge.kind === "data" || edge.kind === "exec") &&
              (edge.kind === "exec"
                ? edge.from === "loop" || edge.to === "loop"
                : edge.from.node === "loop" ||
                  edge.to.node === "loop" ||
                  edge.from.node === "worker" ||
                  edge.to.node === "worker")
            ),
        ),
        {
          kind: "data",
          from: { node: "plain", port: "context" },
          to: { node: "gate", port: "prompt" },
        },
        { kind: "exec", from: "plain", to: "gate" },
      ],
    };

    expect(variablesPortsForContainer(plain).map((port) => port.id)).toEqual([
      "context",
    ]);

    const nodes = harnessToFlowNodes(harness);
    const edges = harnessToFlowEdges(harness);
    assertLayoutInvariants(nodes);

    const variables = nodes.find(
      (node) => node.id === bodyHelperNodeId("plain", "variables"),
    );
    expect(variables?.data.ports.map((port) => port.id)).toEqual(["context"]);

    const passThrough = edges.find(
      (edge) =>
        edge.data?.kind === "data" &&
        edge.target === "gate" &&
        edge.targetHandle === "prompt",
    );
    expect(passThrough).toMatchObject({
      source: bodyHelperNodeId("plain", "variables"),
      sourceHandle: "context",
    });
  });
});
