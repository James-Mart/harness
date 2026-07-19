import { describe, expect, it } from "vitest";

import { assertLayoutInvariants } from "@/authoring/layoutInvariants";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import {
  bodyHelperNodeId,
  harnessToFlowEdges,
  harnessToFlowNodes,
  variablesPortsForContainer,
} from "@/components/canvas/harnessToFlow";
import {
  CURRENT_ITEM_PORT_ID,
  createBaseSeedHarness,
  createEunomioSeedHarness,
  createTrackerSeedHarness,
  mockSchema,
  type ContainerNode,
  type Harness,
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

      // Canvas-level body is non-iterating with no readable values yet.
      expect(
        nodes.find(
          (node) =>
            node.id === bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "variables"),
        ),
      ).toBeUndefined();

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
      // No `$currentItem` — nothing for Variables to surface.
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
