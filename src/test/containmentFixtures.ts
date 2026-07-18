import type { ContainmentFlowNode } from "@/authoring/containment";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";

type Size = { width: number; height: number };
type Pos = { x: number; y: number };

export function harnessShell(
  size: Size = { width: 400, height: 300 },
): ContainmentFlowNode {
  return {
    id: HARNESS_FLOW_NODE_ID,
    type: "harness",
    position: { x: 0, y: 0 },
    style: size,
  };
}

export function containerAt(
  id: string,
  position: Pos,
  size: Size,
  parentId: string = HARNESS_FLOW_NODE_ID,
): ContainmentFlowNode {
  return {
    id,
    type: "container",
    parentId,
    position,
    style: size,
  };
}

export function leafAt(
  id: string,
  position: Pos,
  size: Size,
  parentId: string = HARNESS_FLOW_NODE_ID,
): ContainmentFlowNode {
  return {
    id,
    type: "leaf",
    parentId,
    position,
    style: size,
  };
}

/** Source center sits inside `loop` (absolute ~140,140). */
export function nestSourceIntoLoopNodes(): ContainmentFlowNode[] {
  return [
    harnessShell(),
    containerAt("loop", { x: 40, y: 40 }, { width: 200, height: 200 }),
    leafAt("source", { x: 100, y: 100 }, { width: 80, height: 80 }),
  ];
}

/** Worker dragged out of `loop` onto the harness body (absolute center ~60,120). */
export function unnestWorkerOntoHarnessNodes(): ContainmentFlowNode[] {
  return [
    harnessShell(),
    containerAt("loop", { x: 200, y: 40 }, { width: 160, height: 160 }),
    leafAt("worker", { x: -180, y: 40 }, { width: 80, height: 80 }, "loop"),
  ];
}

/** Leaf center inside nested `inner` (and therefore `outer` + harness). */
export function deepestContainerNodes(): ContainmentFlowNode[] {
  return [
    harnessShell({ width: 500, height: 400 }),
    containerAt("outer", { x: 20, y: 20 }, { width: 300, height: 300 }),
    containerAt(
      "inner",
      { x: 40, y: 40 },
      { width: 160, height: 160 },
      "outer",
    ),
    leafAt("leaf", { x: 100, y: 100 }, { width: 40, height: 40 }),
  ];
}

/** Outer container whose center intersects its own child — must not cycle. */
export function cycleAvoidanceNodes(): ContainmentFlowNode[] {
  return [
    harnessShell(),
    containerAt("outer", { x: 20, y: 20 }, { width: 300, height: 260 }),
    containerAt(
      "inner",
      { x: 40, y: 40 },
      { width: 120, height: 120 },
      "outer",
    ),
  ];
}
