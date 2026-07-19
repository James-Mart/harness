import { act } from "@testing-library/react";
import type { NodeChange, OnNodeDrag } from "@xyflow/react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { expect } from "vitest";

import { useCanvasSelection } from "@/authoring/useCanvasSelection";
import { useContainmentDragDraft } from "@/authoring/useContainmentDragDraft";
import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import {
  harnessToFlowEdges,
  harnessToFlowNodes,
} from "@/components/canvas/harnessToFlow";
import { createBaseSeedHarness, type Harness } from "@/model";

export const DRAG_PIPELINE_SOURCE_ID = "source";
export const DRAG_PIPELINE_STATIONARY_ID = "loop";

export type DragPipelineOptions = {
  /** When true, drag-stop commits containment + top-level position to harness. */
  commitHarness?: boolean;
};

/**
 * Edit-mode drag path as `EditorLayout` wires it: harness → flow nodes →
 * containment draft → selection. Optionally commits harness on drag-stop.
 */
export function useDragPipeline(options: DragPipelineOptions = {}) {
  const { commitHarness = false } = options;
  const [harness, setHarness] = useState(() => createBaseSeedHarness());
  const flowNodes = useMemo(() => harnessToFlowNodes(harness), [harness]);
  const flowEdges = useMemo(() => harnessToFlowEdges(harness), [harness]);

  const harnessSetter: Dispatch<SetStateAction<Harness>> = commitHarness
    ? setHarness
    : () => undefined;

  const {
    nodes: draftNodes,
    onNodeDragStart,
    onNodesChange: onDragNodesChange,
    onNodeDragStop,
  } = useContainmentDragDraft(flowNodes, harnessSetter);

  const { nodes, selectedNodeIds, onNodesChange } = useCanvasSelection(
    draftNodes,
    flowEdges,
    onDragNodesChange,
  );

  return {
    harness,
    nodes,
    selectedNodeIds,
    onNodeDragStart,
    onNodesChange,
    onNodeDragStop,
  };
}

export type DragPipelineResult = ReturnType<typeof useDragPipeline>;
export type PipelineHookResult = { current: DragPipelineResult };

export function nodeById(
  result: PipelineHookResult,
  id: string,
): HarnessFlowNode {
  const node = result.current.nodes.find((entry) => entry.id === id);
  expect(node).toBeDefined();
  return node as HarnessFlowNode;
}

/** The measured size RF would stamp mid-drag = the node's laid-out `style`. */
export function measuredFromStyle(node: HarnessFlowNode): {
  width: number;
  height: number;
} {
  const { width, height } = node.style ?? {};
  expect(typeof width).toBe("number");
  expect(typeof height).toBe("number");
  return { width: Number(width), height: Number(height) };
}

/** A real drag frame: a position move plus RF's (re)measure of the node. */
export function dragFrame(
  position: { x: number; y: number },
  dimensions: { width: number; height: number },
  id: string = DRAG_PIPELINE_SOURCE_ID,
): NodeChange<HarnessFlowNode>[] {
  return [
    { id, type: "position", position, dragging: true },
    { id, type: "dimensions", dimensions, setAttributes: true },
  ];
}

/** Start a drag; `onNodeDragStart` ignores its args and only snapshots nodes. */
export function beginDrag(
  result: PipelineHookResult,
  id: string = DRAG_PIPELINE_SOURCE_ID,
): void {
  const dragged = nodeById(result, id);
  act(() => {
    result.current.onNodeDragStart({} as never, dragged, [dragged]);
  });
}

/** Commit the active drag via the containment draft's stop handler. */
export function simulateDragStop(
  result: PipelineHookResult,
  id: string = DRAG_PIPELINE_SOURCE_ID,
): void {
  const node = nodeById(result, id);
  act(() => {
    (result.current.onNodeDragStop as OnNodeDrag<HarnessFlowNode>)(
      {} as never,
      node,
      [node],
    );
  });
}
