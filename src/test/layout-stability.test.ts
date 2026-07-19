import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { FlowGeometryNode } from "@/authoring/flowGeometry";
import {
  assertLayoutInvariants,
  layoutInvariantViolations,
} from "@/authoring/layoutInvariants";
import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import { createBaseSeedHarness } from "@/model";
import {
  DRAG_PIPELINE_SOURCE_ID,
  beginDrag,
  dragFrame,
  measuredFromStyle,
  nodeById,
  simulateDragStop,
  useDragPipeline,
} from "@/test/dragPipelineFixtures";

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
  it("holds for the base seed before any drag", () => {
    assertLayoutInvariants(harnessToFlowNodes(createBaseSeedHarness()));
  });

  it("keeps sibling roots non-overlapping after dragging the first top-level node down", () => {
    const { result } = renderHook(() =>
      useDragPipeline({ commitHarness: true }),
    );
    const dragged = nodeById(result, DRAG_PIPELINE_SOURCE_ID);
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

    // Desired: persist the drag without re-packing other roots into the drop.
    // On current main, only the dragged root is placed, so auto roots collapse
    // left and overlap it.
    assertLayoutInvariants(harnessToFlowNodes(result.current.harness));
  });
});
