import type {
  ContainerFlowNode,
  HarnessFlowNode,
  LeafFlowNode,
} from "@/components/canvas/flowTypes";
import { FLOW_LAYOUT } from "@/components/canvas/layoutTokens";
import type { Harness, Node as HarnessNode, NodeId } from "@/model/types";

type Size = { width: number; height: number };

function childrenOf(nodes: HarnessNode[], parentId: string): HarnessNode[] {
  return nodes.filter((node) => node.parentId === parentId);
}

/** Bottom-up size cache — one walk, reused by the position pass. */
function measureTree(
  harness: Harness,
  node: HarnessNode,
  sizes: Map<NodeId, Size>,
): Size {
  if (node.kind === "leaf") {
    const size = {
      width: FLOW_LAYOUT.leafWidth,
      height: FLOW_LAYOUT.leafHeight,
    };
    sizes.set(node.id, size);
    return size;
  }

  const kids = childrenOf(harness.nodes, node.id);
  if (kids.length === 0) {
    const size = {
      width: FLOW_LAYOUT.containerMinWidth,
      height:
        FLOW_LAYOUT.containerHeaderHeight +
        FLOW_LAYOUT.containerPadY * 2 +
        FLOW_LAYOUT.leafHeight,
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
  node: Extract<HarnessNode, { kind: "leaf" }>,
  position: { x: number; y: number },
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
      ...(node.isGate ? { isGate: true } : {}),
    },
    style: {
      width: FLOW_LAYOUT.leafWidth,
      height: FLOW_LAYOUT.leafHeight,
    },
  };
}

function toContainerFlowNode(
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
    out.push(toLeafFlowNode(node, position, parentId));
    return;
  }

  out.push(toContainerFlowNode(node, position, size, parentId));

  const kids = childrenOf(harness.nodes, node.id);
  let y = FLOW_LAYOUT.containerHeaderHeight + FLOW_LAYOUT.containerPadY;
  for (const child of kids) {
    const childSize = sizes.get(child.id);
    if (!childSize) {
      throw new Error(`Missing measured size for node ${child.id}`);
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
