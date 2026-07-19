import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { FlowGeometryNode } from "@/authoring/flowGeometry";
import {
  assertLayoutInvariants,
  layoutInvariantViolations,
} from "@/authoring/layoutInvariants";
import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import {
  createBaseSeedHarness,
  createBranchingSeedHarness,
  createEunomioSeedHarness,
  createTrackerSeedHarness,
  createWorkPoolSeedHarness,
} from "@/model";
import {
  DRAG_PIPELINE_SOURCE_ID,
  DRAG_PIPELINE_STATIONARY_ID,
  beginDrag,
  dragFrame,
  measuredFromStyle,
  nodeById,
  simulateDragStop,
  useDragPipeline,
} from "@/test/dragPipelineFixtures";

const SEED_HARNESSES = [
  createBaseSeedHarness,
  createBranchingSeedHarness,
  createWorkPoolSeedHarness,
  createTrackerSeedHarness,
  createEunomioSeedHarness,
] as const;

function geo(
  id: string,
  position: { x: number; y: number },
  size: { width: number; height: number },
  parentId?: string,
): FlowGeometryNode {
  return {
    id,
    type: "leaf",
    position,
    ...(parentId !== undefined ? { parentId } : {}),
    style: size,
  };
}

describe("layoutInvariantViolations", () => {
  it("accepts a clean parent/child layout", () => {
    const nodes = [
      geo("parent", { x: 0, y: 0 }, { width: 200, height: 200 }),
      geo("child", { x: 20, y: 20 }, { width: 80, height: 60 }, "parent"),
    ];
    expect(layoutInvariantViolations(nodes)).toEqual([]);
  });

  it("reports overlapping siblings", () => {
    const nodes = [
      geo("a", { x: 0, y: 0 }, { width: 100, height: 100 }),
      geo("b", { x: 50, y: 50 }, { width: 100, height: 100 }),
    ];
    expect(layoutInvariantViolations(nodes)).toEqual([
      {
        kind: "overlap",
        aId: "a",
        bId: "b",
        a: { x: 0, y: 0, width: 100, height: 100 },
        b: { x: 50, y: 50, width: 100, height: 100 },
      },
    ]);
  });

  it("reports a child that escapes its parent", () => {
    const nodes = [
      geo("parent", { x: 0, y: 0 }, { width: 100, height: 100 }),
      geo("child", { x: 80, y: 80 }, { width: 50, height: 50 }, "parent"),
    ];
    expect(layoutInvariantViolations(nodes)).toEqual([
      {
        kind: "escape",
        childId: "child",
        parentId: "parent",
        child: { x: 80, y: 80, width: 50, height: 50 },
        parent: { x: 0, y: 0, width: 100, height: 100 },
      },
    ]);
  });

  it("reports a child whose parent is absent from the node list", () => {
    const nodes = [
      geo("orphan", { x: 0, y: 0 }, { width: 40, height: 40 }, "missing"),
    ];
    expect(layoutInvariantViolations(nodes)).toEqual([
      {
        kind: "missingParent",
        childId: "orphan",
        parentId: "missing",
      },
    ]);
  });
});

describe("layout stability (drag)", () => {
  it.each(SEED_HARNESSES.map((create) => [create.name, create] as const))(
    "holds for %s before any drag",
    (_name, create) => {
      assertLayoutInvariants(harnessToFlowNodes(create()));
    },
  );

  it("keeps sibling roots non-overlapping after dragging the first top-level node down", () => {
    const { result } = renderHook(() =>
      useDragPipeline({ commitHarness: true }),
    );
    const dragged = nodeById(result, DRAG_PIPELINE_SOURCE_ID);
    const stationary = nodeById(result, DRAG_PIPELINE_STATIONARY_ID);
    const stationaryBefore = { ...stationary.position };
    const dimensions = measuredFromStyle(dragged);
    const drop = {
      x: dragged.position.x,
      y: dragged.position.y + 120,
    };

    beginDrag(result);
    act(() => {
      result.current.onNodesChange(dragFrame(drop, dimensions));
    });
    simulateDragStop(result);

    const harness = result.current.harness;
    expect(
      harness.nodes.find((node) => node.id === DRAG_PIPELINE_SOURCE_ID)
        ?.position,
    ).toEqual(drop);
    expect(
      harness.nodes.find((node) => node.id === DRAG_PIPELINE_STATIONARY_ID)
        ?.position,
    ).toEqual(stationaryBefore);

    assertLayoutInvariants(harnessToFlowNodes(harness));
  });

  it("still reparents into a container when the drop lands inside one", () => {
    const { result } = renderHook(() =>
      useDragPipeline({ commitHarness: true }),
    );
    const dragged = nodeById(result, DRAG_PIPELINE_SOURCE_ID);
    const loop = nodeById(result, DRAG_PIPELINE_STATIONARY_ID);
    const dimensions = measuredFromStyle(dragged);
    // Center of source inside loop body (harness-relative coords).
    const drop = {
      x: loop.position.x + 40,
      y: loop.position.y + 40,
    };

    beginDrag(result);
    act(() => {
      result.current.onNodesChange(dragFrame(drop, dimensions));
    });
    simulateDragStop(result);

    const source = result.current.harness.nodes.find(
      (node) => node.id === DRAG_PIPELINE_SOURCE_ID,
    );
    expect(source?.parentId).toBe(DRAG_PIPELINE_STATIONARY_ID);
    expect(source?.position).toBeUndefined();
    expect(
      result.current.harness.nodes.find(
        (node) => node.id === DRAG_PIPELINE_STATIONARY_ID,
      )?.position,
    ).toBeUndefined();
    expect(
      harnessToFlowNodes(result.current.harness).find(
        (node) => node.id === DRAG_PIPELINE_SOURCE_ID,
      )?.parentId,
    ).toBe(DRAG_PIPELINE_STATIONARY_ID);
    assertLayoutInvariants(harnessToFlowNodes(result.current.harness));
  });
});
