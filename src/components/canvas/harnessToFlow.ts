import { MarkerType, type Edge as FlowEdge } from "@xyflow/react";

import type {
  ContainerFlowNode,
  HarnessFlowNode,
  LeafFlowNode,
} from "@/components/canvas/flowTypes";
import {
  FLOW_LAYOUT,
  leafHeightForPortCount,
} from "@/components/canvas/layoutTokens";
import {
  portsByDirection,
  schemaAccent,
} from "@/components/canvas/portVisuals";
import {
  EXEC_IN_HANDLE,
  execEdgeId,
  execOutBranchesForNode,
  execOutHandleId,
} from "@/model/exec";
import type { Harness, Node as HarnessNode, NodeId, Port } from "@/model/types";
import { dataEdgeId, findPort } from "@/model/wiring";

type Size = { width: number; height: number };

function childrenOf(nodes: HarnessNode[], parentId: string): HarnessNode[] {
  return nodes.filter((node) => node.parentId === parentId);
}

function leafSize(ports: readonly Port[], execOutCount: number): Size {
  const { inputs, outputs } = portsByDirection(ports);
  return {
    width: FLOW_LAYOUT.leafWidth,
    height: leafHeightForPortCount(
      Math.max(inputs.length, outputs.length),
      execOutCount,
    ),
  };
}

/** Bottom-up size cache — one walk, reused by the position pass. */
function measureTree(
  harness: Harness,
  node: HarnessNode,
  sizes: Map<NodeId, Size>,
): Size {
  if (node.kind === "leaf") {
    const execOutCount = Math.max(
      1,
      execOutBranchesForNode(harness, node).length,
    );
    const size = leafSize(node.ports, execOutCount);
    sizes.set(node.id, size);
    return size;
  }

  const kids = childrenOf(harness.nodes, node.id);
  if (kids.length === 0) {
    const emptyLeaf = leafSize([], 1);
    const size = {
      width: FLOW_LAYOUT.containerMinWidth,
      height:
        FLOW_LAYOUT.containerHeaderHeight +
        FLOW_LAYOUT.containerPadY * 2 +
        emptyLeaf.height,
    };
    sizes.set(node.id, size);
    return size;
  }

  const childSizes = kids.map((child) => measureTree(harness, child, sizes));
  const contentWidth = Math.max(...childSizes.map((size) => size.width));
  const contentHeight =
    childSizes.reduce((sum, size) => sum + size.height, 0) +
    FLOW_LAYOUT.childGap * (kids.length - 1);

  const size = {
    width: Math.max(
      FLOW_LAYOUT.containerMinWidth,
      contentWidth + FLOW_LAYOUT.containerPadX * 2,
    ),
    height:
      FLOW_LAYOUT.containerHeaderHeight +
      FLOW_LAYOUT.containerPadY * 2 +
      contentHeight,
  };
  sizes.set(node.id, size);
  return size;
}

function toLeafFlowNode(
  harness: Harness,
  node: Extract<HarnessNode, { kind: "leaf" }>,
  position: { x: number; y: number },
  size: Size,
  parentId?: string,
): LeafFlowNode {
  return {
    id: node.id,
    type: "leaf",
    position,
    ...(parentId !== undefined ? { parentId, extent: "parent" as const } : {}),
    data: {
      title: node.title,
      catalogType: node.type,
      ports: node.ports,
      execOutBranches: execOutBranchesForNode(harness, node),
      ...(node.isGate ? { isGate: true } : {}),
    },
    style: {
      width: size.width,
      height: size.height,
    },
  };
}

function toContainerFlowNode(
  harness: Harness,
  node: Extract<HarnessNode, { kind: "container" }>,
  position: { x: number; y: number },
  size: Size,
  parentId?: string,
): ContainerFlowNode {
  return {
    id: node.id,
    type: "container",
    position,
    ...(parentId !== undefined ? { parentId, extent: "parent" as const } : {}),
    data: {
      title: node.title,
      catalogType: node.type,
      ports: node.ports,
      execOutBranches: execOutBranchesForNode(harness, node),
      iterablePortId: node.iterablePortId,
      sourceKind: node.source.kind,
    },
    style: { width: size.width, height: size.height },
  };
}

function positionSubtree(
  harness: Harness,
  node: HarnessNode,
  position: { x: number; y: number },
  parentId: string | undefined,
  sizes: Map<NodeId, Size>,
  out: HarnessFlowNode[],
): void {
  const size = sizes.get(node.id);
  if (!size) {
    throw new Error(`Missing measured size for node ${node.id}`);
  }

  if (node.kind === "leaf") {
    out.push(toLeafFlowNode(harness, node, position, size, parentId));
    return;
  }

  out.push(toContainerFlowNode(harness, node, position, size, parentId));

  const kids = childrenOf(harness.nodes, node.id);
  let y = FLOW_LAYOUT.containerHeaderHeight + FLOW_LAYOUT.containerPadY;
  for (const child of kids) {
    const childSize = sizes.get(child.id);
    if (!childSize) {
      throw new Error(`Missing measured size for child ${child.id}`);
    }
    positionSubtree(
      harness,
      child,
      { x: FLOW_LAYOUT.containerPadX, y },
      node.id,
      sizes,
      out,
    );
    y += childSize.height + FLOW_LAYOUT.childGap;
  }
}

/**
 * Convert a harness graph into React Flow nodes with parent/child
 * containment. Positions are a simple left-to-right / nested stack
 * layout for static viewing.
 */
export function harnessToFlowNodes(harness: Harness): HarnessFlowNode[] {
  const roots = harness.nodes.filter((node) => node.parentId === undefined);
  const sizes = new Map<NodeId, Size>();
  for (const root of roots) {
    measureTree(harness, root, sizes);
  }

  const out: HarnessFlowNode[] = [];
  let x = 0;
  for (const root of roots) {
    const size = sizes.get(root.id);
    if (!size) {
      throw new Error(`Missing measured size for node ${root.id}`);
    }
    positionSubtree(harness, root, { x, y: 0 }, undefined, sizes, out);
    x += size.width + FLOW_LAYOUT.topLevelGap;
  }

  return out;
}

/** React Flow edges for harness data wires and exec control edges. */
export function harnessToFlowEdges(harness: Harness): FlowEdge[] {
  const dataEdges: FlowEdge[] = harness.edges
    .filter((edge) => edge.kind === "data")
    .map((edge) => {
      const fromPort = findPort(harness, edge.from);
      const stroke = fromPort
        ? schemaAccent(fromPort.schema)
        : "var(--muted-foreground)";
      return {
        id: dataEdgeId(edge.from, edge.to),
        source: edge.from.node,
        sourceHandle: edge.from.port,
        target: edge.to.node,
        targetHandle: edge.to.port,
        type: "default",
        style: { stroke, strokeWidth: 2 },
        data: { kind: "data" as const },
      };
    });

  const execEdges: FlowEdge[] = harness.edges
    .filter((edge) => edge.kind === "exec")
    .map((edge) => ({
      id: execEdgeId(edge.from, edge.to, edge.branch),
      source: edge.from,
      sourceHandle: execOutHandleId(edge.branch),
      target: edge.to,
      targetHandle: EXEC_IN_HANDLE,
      type: "smoothstep",
      label: edge.branch,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: "var(--foreground)",
      },
      style: {
        stroke: "var(--foreground)",
        strokeWidth: 1.75,
      },
      data: {
        kind: "exec" as const,
        ...(edge.branch !== undefined ? { branch: edge.branch } : {}),
      },
    }));

  return [...dataEdges, ...execEdges];
}
