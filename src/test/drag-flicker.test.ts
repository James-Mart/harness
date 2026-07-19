import { act, renderHook } from "@testing-library/react";
import type { NodeChange } from "@xyflow/react";
import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";

import { useCanvasSelection } from "@/authoring/useCanvasSelection";
import { useContainmentDragDraft } from "@/authoring/useContainmentDragDraft";
import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import {
  harnessToFlowEdges,
  harnessToFlowNodes,
} from "@/components/canvas/harnessToFlow";
import { createBaseSeedHarness } from "@/model";

/**
 * Compose the state half of the Edit-mode path the way `EditorLayout` feeds
 * React Flow: harness -> flow nodes -> `useContainmentDragDraft` ->
 * `useCanvasSelection` (composed `onNodesChange` + selection stamping).
 */
function useDragPipeline() {
  const [harness] = useState(() => createBaseSeedHarness());
  const flowNodes = useMemo(() => harnessToFlowNodes(harness), [harness]);
  const flowEdges = useMemo(() => harnessToFlowEdges(harness), [harness]);

  const {
    nodes: draftNodes,
    onNodeDragStart,
    onNodesChange: onDragNodesChange,
  } = useContainmentDragDraft(flowNodes, () => undefined);

  const { nodes, selectedNodeIds, onNodesChange } = useCanvasSelection(
    draftNodes,
    flowEdges,
    onDragNodesChange,
  );

  return { nodes, selectedNodeIds, onNodeDragStart, onNodesChange };
}

const DRAGGED_ID = "source";
const STATIONARY_ID = "loop";

type PipelineResult = { current: ReturnType<typeof useDragPipeline> };

function nodeById(result: PipelineResult, id: string): HarnessFlowNode {
  const node = result.current.nodes.find((entry) => entry.id === id);
  expect(node).toBeDefined();
  return node as HarnessFlowNode;
}

/** The measured size RF would stamp mid-drag = the node's laid-out `style`. */
function measuredFromStyle(node: HarnessFlowNode): {
  width: number;
  height: number;
} {
  const { width, height } = node.style ?? {};
  expect(typeof width).toBe("number");
  expect(typeof height).toBe("number");
  return { width: Number(width), height: Number(height) };
}

/** A real drag frame: a position move plus RF's (re)measure of the node. */
function dragFrame(
  position: { x: number; y: number },
  dimensions: { width: number; height: number },
): NodeChange<HarnessFlowNode>[] {
  return [
    { id: DRAGGED_ID, type: "position", position, dragging: true },
    { id: DRAGGED_ID, type: "dimensions", dimensions, setAttributes: true },
  ];
}

/** Start a drag; `onNodeDragStart` ignores its args and only snapshots nodes. */
function beginDrag(result: PipelineResult): void {
  const dragged = nodeById(result, DRAGGED_ID);
  act(() => {
    result.current.onNodeDragStart({} as never, dragged, [dragged]);
  });
}

describe("Edit-mode drag white-flash regression (Red)", () => {
  it("keeps the dragged node's measured dimensions through the draft + selection remap", () => {
    const { result } = renderHook(() => useDragPipeline());
    const dimensions = measuredFromStyle(nodeById(result, DRAGGED_ID));

    beginDrag(result);

    act(() => {
      result.current.onNodesChange(dragFrame({ x: 480, y: 320 }, dimensions));
    });

    // If the dimensions change is dropped, RF sees an unmeasured node
    // mid-drag and blanks the canvas (white flash).
    expect(nodeById(result, DRAGGED_ID).measured).toEqual(dimensions);
  });

  it("preserves un-moved node identity across consecutive drag frames", () => {
    const { result } = renderHook(() => useDragPipeline());
    const dimensions = measuredFromStyle(nodeById(result, DRAGGED_ID));

    beginDrag(result);
    const stationaryStart = nodeById(result, STATIONARY_ID);

    // Two consecutive frames (distinct positions) — the flicker is per
    // pointer-move, so identity must survive repeated per-frame remaps.
    act(() => {
      result.current.onNodesChange(dragFrame({ x: 480, y: 320 }, dimensions));
    });
    const stationaryFrame1 = nodeById(result, STATIONARY_ID);

    act(() => {
      result.current.onNodesChange(dragFrame({ x: 520, y: 360 }, dimensions));
    });
    const stationaryFrame2 = nodeById(result, STATIONARY_ID);

    // Reallocating every node object per frame churns RF's node internals.
    expect(stationaryFrame1).toBe(stationaryStart);
    expect(stationaryFrame2).toBe(stationaryStart);
  });
});

describe("composed onNodesChange selection", () => {
  it("stamps selected from a select change batch on the first pass", () => {
    const { result } = renderHook(() => useDragPipeline());

    act(() => {
      result.current.onNodesChange([
        { id: DRAGGED_ID, type: "select", selected: true },
      ]);
    });

    expect(result.current.selectedNodeIds).toEqual([DRAGGED_ID]);
    expect(nodeById(result, DRAGGED_ID).selected).toBe(true);
    expect(nodeById(result, STATIONARY_ID).selected).toBeFalsy();
  });
});
