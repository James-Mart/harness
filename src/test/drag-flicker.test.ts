import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DRAG_PIPELINE_SOURCE_ID,
  DRAG_PIPELINE_STATIONARY_ID,
  beginDrag,
  dragFrame,
  measuredFromStyle,
  nodeById,
  useDragPipeline,
} from "@/test/dragPipelineFixtures";

describe("Edit-mode drag white-flash regression (Red)", () => {
  it("keeps the dragged node's measured dimensions through the draft + selection remap", () => {
    const { result } = renderHook(() => useDragPipeline());
    const dimensions = measuredFromStyle(
      nodeById(result, DRAG_PIPELINE_SOURCE_ID),
    );

    beginDrag(result);

    act(() => {
      result.current.onNodesChange(dragFrame({ x: 480, y: 320 }, dimensions));
    });

    // If the dimensions change is dropped, RF sees an unmeasured node
    // mid-drag and blanks the canvas (white flash).
    expect(nodeById(result, DRAG_PIPELINE_SOURCE_ID).measured).toEqual(
      dimensions,
    );
  });

  it("preserves un-moved node identity across consecutive drag frames", () => {
    const { result } = renderHook(() => useDragPipeline());
    const dimensions = measuredFromStyle(
      nodeById(result, DRAG_PIPELINE_SOURCE_ID),
    );

    beginDrag(result);
    const stationaryStart = nodeById(result, DRAG_PIPELINE_STATIONARY_ID);

    // Two consecutive frames (distinct positions) — the flicker is per
    // pointer-move, so identity must survive repeated per-frame remaps.
    act(() => {
      result.current.onNodesChange(dragFrame({ x: 480, y: 320 }, dimensions));
    });
    const stationaryFrame1 = nodeById(result, DRAG_PIPELINE_STATIONARY_ID);

    act(() => {
      result.current.onNodesChange(dragFrame({ x: 520, y: 360 }, dimensions));
    });
    const stationaryFrame2 = nodeById(result, DRAG_PIPELINE_STATIONARY_ID);

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
        { id: DRAG_PIPELINE_SOURCE_ID, type: "select", selected: true },
      ]);
    });

    expect(result.current.selectedNodeIds).toEqual([DRAG_PIPELINE_SOURCE_ID]);
    expect(nodeById(result, DRAG_PIPELINE_SOURCE_ID).selected).toBe(true);
    expect(nodeById(result, DRAG_PIPELINE_STATIONARY_ID).selected).toBeFalsy();
  });
});
