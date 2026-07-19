import { describe, expect, it } from "vitest";

import { assertLayoutInvariants } from "@/authoring/layoutInvariants";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import {
  bodyHelperNodeId,
  harnessToFlowEdges,
  harnessToFlowNodes,
  partitionContainerExecOuts,
} from "@/components/canvas/harnessToFlow";
import {
  createBaseSeedHarness,
  createEunomioSeedHarness,
  createTrackerSeedHarness,
  execOutHandleId,
  type Harness,
  type NodeId,
} from "@/model";
import { containerIds } from "@/test/harnessTestUtils";

function childIds(harness: Harness, parentId: NodeId): Set<NodeId> {
  return new Set(
    harness.nodes
      .filter((node) => node.parentId === parentId)
      .map((node) => node.id),
  );
}

describe("internal Exec node", () => {
  it.each([
    ["tracker", createTrackerSeedHarness] as const,
    ["eunomio", createEunomioSeedHarness] as const,
  ])(
    "%s: body-entry exec comes from Exec; outer outs are siblings only",
    (_name, create) => {
      const harness = create();
      const nodes = harnessToFlowNodes(harness);
      const edges = harnessToFlowEdges(harness);
      assertLayoutInvariants(nodes);

      const canvasExec = nodes.find(
        (node) => node.id === bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "exec"),
      );
      expect(canvasExec).toMatchObject({
        type: "helper",
        parentId: HARNESS_FLOW_NODE_ID,
        draggable: false,
        deletable: false,
        selectable: false,
        data: { kind: "exec", title: "Exec", execOutBranches: [undefined] },
      });

      for (const containerId of containerIds(harness)) {
        const partition = partitionContainerExecOuts(harness, containerId);
        const exec = nodes.find(
          (node) => node.id === bodyHelperNodeId(containerId, "exec"),
        );
        expect(exec).toMatchObject({
          type: "helper",
          parentId: containerId,
          data: {
            kind: "exec",
            title: "Exec",
            execOutBranches:
              partition.bodyEntryBranches.length > 0
                ? partition.bodyEntryBranches
                : [undefined],
          },
        });

        const container = nodes.find((node) => node.id === containerId);
        expect(container?.type).toBe("container");
        if (container?.type !== "container") {
          throw new Error(`expected container ${containerId}`);
        }
        expect(container.data.execOutBranches).toEqual(
          partition.outer.length > 0 ? partition.outerBranches : [],
        );
      }

      const children = new Map(
        containerIds(harness).map((id) => [id, childIds(harness, id)]),
      );
      const modelExec = harness.edges.filter((edge) => edge.kind === "exec");

      for (const edge of modelExec) {
        const flow = edges.find(
          (entry) =>
            entry.data?.kind === "exec" &&
            entry.target === edge.to &&
            (entry.data.branch ?? undefined) === (edge.branch ?? undefined),
        );
        expect(flow).toBeDefined();

        const bodyChildren = children.get(edge.from);
        if (bodyChildren?.has(edge.to)) {
          // container → first-child (body entry): sourced from Exec helper
          expect(flow!.source).toBe(bodyHelperNodeId(edge.from, "exec"));
          expect(flow!.sourceHandle).toBe(execOutHandleId(edge.branch));
        } else {
          // sibling / child→child: source unchanged
          expect(flow!.source).toBe(edge.from);
        }
      }

      for (const containerId of containerIds(harness)) {
        const bodyChildren = children.get(containerId)!;
        const outerOuts = edges.filter(
          (edge) => edge.data?.kind === "exec" && edge.source === containerId,
        );
        for (const out of outerOuts) {
          expect(bodyChildren.has(out.target)).toBe(false);
        }

        const modelSiblingTargets = modelExec
          .filter(
            (edge) => edge.from === containerId && !bodyChildren.has(edge.to),
          )
          .map((edge) => edge.to);
        expect(outerOuts.map((edge) => edge.target).sort()).toEqual(
          [...modelSiblingTargets].sort(),
        );
      }
    },
  );

  it("exposes branched body-entry pins on the Exec helper", () => {
    const base = createBaseSeedHarness();
    const harness: Harness = {
      ...base,
      edges: [
        ...base.edges.filter(
          (edge) => !(edge.kind === "exec" && edge.from === "loop"),
        ),
        { kind: "exec", from: "loop", to: "worker", branch: "ok" },
        {
          kind: "exec",
          from: "loop",
          to: "worker",
          branch: "deny",
        },
      ],
    };

    const partition = partitionContainerExecOuts(harness, "loop");
    expect(partition.bodyEntryBranches).toEqual(["ok", "deny"]);
    expect(partition.outerBranches).toEqual([]);

    const nodes = harnessToFlowNodes(harness);
    const edges = harnessToFlowEdges(harness);
    const exec = nodes.find(
      (node) => node.id === bodyHelperNodeId("loop", "exec"),
    );
    expect(exec?.type).toBe("helper");
    if (exec?.type !== "helper") throw new Error("expected helper");
    expect(exec.data.execOutBranches).toEqual(["ok", "deny"]);

    const loop = nodes.find((node) => node.id === "loop");
    expect(loop?.type).toBe("container");
    if (loop?.type !== "container") throw new Error("expected container");
    expect(loop.data.execOutBranches).toEqual([]);

    const ok = edges.find(
      (edge) =>
        edge.data?.kind === "exec" &&
        edge.target === "worker" &&
        edge.data.branch === "ok",
    );
    expect(ok).toMatchObject({
      source: bodyHelperNodeId("loop", "exec"),
      sourceHandle: execOutHandleId("ok"),
    });
    const deny = edges.find(
      (edge) =>
        edge.data?.kind === "exec" &&
        edge.target === "worker" &&
        edge.data.branch === "deny",
    );
    expect(deny).toMatchObject({
      source: bodyHelperNodeId("loop", "exec"),
      sourceHandle: execOutHandleId("deny"),
    });
  });
});
