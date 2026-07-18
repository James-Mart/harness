import { MarkerType, type Edge as FlowEdge } from "@xyflow/react";

import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import type {
  ContainerFlowNode,
  HarnessBoundaryFlowNode,
  HarnessFlowNode,
  LeafFlowNode,
} from "@/components/canvas/flowTypes";
import {
  FLOW_LAYOUT,
  containerChromeHeaderHeight,
  leafHeightForPortCount,
} from "@/components/canvas/layoutTokens";
import {
  portsByDirection,
  schemaAccent,
} from "@/components/canvas/portVisuals";
import { toAppendFlowEdge } from "@/components/canvas/workpoolVisuals";
import {
  EXEC_IN_HANDLE,
  execEdgeId,
  execOutBranchesForNode,
  execOutHandleId,
} from "@/model/exec";
import { effectiveConcurrency } from "@/model/readySet";
import type {
  Harness,
  LeafNode,
  Node as HarnessNode,
  NodeId,
  Port,
} from "@/model/types";
import { dataEdgeId, findPort } from "@/model/wiring";
import {
  workPoolAdvisoryCues,
  type WorkPoolAdvisoryCue,
} from "@/model/workpoolGraph";

type Size = { width: number; height: number };

/** Append / fan-out index — enough for edges and leaf/container mapping. */
type AppendIndex = {
  byId: Map<NodeId, HarnessNode>;
  fanOutTargets: Set<NodeId>;
  appenders: Array<LeafNode & { appendsTo: NodeId }>;
};

/** Node conversion index — append data plus precomputed advisory cues. */
type WorkPoolNodeIndex = AppendIndex & {
  cuesByContainer: Map<NodeId, WorkPoolAdvisoryCue[]>;
};

function buildAppendIndex(harness: Harness): AppendIndex {
  const byId = new Map(harness.nodes.map((node) => [node.id, node]));
  const appenders: AppendIndex["appenders"] = [];
  for (const node of harness.nodes) {
    if (node.kind === "leaf" && node.appendsTo !== undefined) {
      appenders.push(node as LeafNode & { appendsTo: NodeId });
    }
  }
  return {
    byId,
    fanOutTargets: new Set(appenders.map((leaf) => leaf.appendsTo)),
    appenders,
  };
}

function buildWorkPoolNodeIndex(harness: Harness): WorkPoolNodeIndex {
  return {
    ...buildAppendIndex(harness),
    cuesByContainer: workPoolAdvisoryCues(harness),
  };
}

function cuesFor(
  nodeId: NodeId,
  index: WorkPoolNodeIndex,
): WorkPoolAdvisoryCue[] {
  return index.cuesByContainer.get(nodeId) ?? [];
}

function childrenOf(nodes: HarnessNode[], parentId: string): HarnessNode[] {
  return nodes.filter((node) => node.parentId === parentId);
}

function leafSize(
  ports: readonly Port[],
  execOutCount: number,
  hasFanOutMarker = false,
): Size {
  const { inputs, outputs } = portsByDirection(ports);
  return {
    width: FLOW_LAYOUT.leafWidth,
    height: leafHeightForPortCount(
      Math.max(inputs.length, outputs.length),
      execOutCount,
      { hasFanOutMarker },
    ),
  };
}

/** Child content size before header/pad chrome — vertical or horizontal. */
function aggregateChildContent(
  childSizes: Size[],
  axis: "vertical" | "horizontal",
): Size {
  if (childSizes.length === 0) {
    return leafSize([], 1);
  }
  if (axis === "vertical") {
    return {
      width: Math.max(...childSizes.map((size) => size.width)),
      height:
        childSizes.reduce((sum, size) => sum + size.height, 0) +
        FLOW_LAYOUT.childGap * (childSizes.length - 1),
    };
  }
  return {
    width:
      childSizes.reduce((sum, size) => sum + size.width, 0) +
      FLOW_LAYOUT.topLevelGap * (childSizes.length - 1),
    height: Math.max(...childSizes.map((size) => size.height)),
  };
}

/** Wrap body content with header + padding chrome. */
function wrapWithHeaderChrome(content: Size, headerHeight: number): Size {
  return {
    width: Math.max(
      FLOW_LAYOUT.containerMinWidth,
      content.width + FLOW_LAYOUT.containerPadX * 2,
    ),
    height: headerHeight + FLOW_LAYOUT.containerPadY * 2 + content.height,
  };
}

/** Bottom-up size cache — one walk, reused by the position pass. */
function measureTree(
  harness: Harness,
  node: HarnessNode,
  sizes: Map<NodeId, Size>,
  index: WorkPoolNodeIndex,
): Size {
  if (node.kind === "leaf") {
    const execOutCount = Math.max(
      1,
      execOutBranchesForNode(harness, node).length,
    );
    const size = leafSize(
      node.ports,
      execOutCount,
      node.appendsTo !== undefined,
    );
    sizes.set(node.id, size);
    return size;
  }

  const kids = childrenOf(harness.nodes, node.id);
  const childSizes = kids.map((child) =>
    measureTree(harness, child, sizes, index),
  );
  const size = wrapWithHeaderChrome(
    aggregateChildContent(childSizes, "vertical"),
    containerChromeHeaderHeight({
      hasAdvisoryCues: cuesFor(node.id, index).length > 0,
    }),
  );
  sizes.set(node.id, size);
  return size;
}

/** Size of the harness shell wrapping top-level nodes left-to-right. */
function measureHarnessShell(rootSizes: Size[]): Size {
  return wrapWithHeaderChrome(
    aggregateChildContent(rootSizes, "horizontal"),
    FLOW_LAYOUT.harnessHeaderHeight,
  );
}

function toLeafFlowNode(
  harness: Harness,
  node: Extract<HarnessNode, { kind: "leaf" }>,
  position: { x: number; y: number },
  size: Size,
  index: AppendIndex,
  parentId?: string,
): LeafFlowNode {
  const appendTarget =
    node.appendsTo === undefined ? undefined : index.byId.get(node.appendsTo);

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
      ...(node.appendsTo !== undefined
        ? {
            appendsTo: node.appendsTo,
            appendsToTitle: appendTarget?.title ?? node.appendsTo,
          }
        : {}),
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
  index: WorkPoolNodeIndex,
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
      concurrency: effectiveConcurrency(harness, node),
      ...(node.end !== undefined ? { end: node.end } : {}),
      hasFanOut: index.fanOutTargets.has(node.id),
      advisoryCues: cuesFor(node.id, index),
    },
    style: { width: size.width, height: size.height },
  };
}

function toHarnessBoundaryFlowNode(
  harness: Harness,
  size: Size,
): HarnessBoundaryFlowNode {
  return {
    id: HARNESS_FLOW_NODE_ID,
    type: "harness",
    position: { x: 0, y: 0 },
    data: {
      title: harness.title,
      ports: harness.boundary,
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
  index: WorkPoolNodeIndex,
  out: HarnessFlowNode[],
): void {
  const size = sizes.get(node.id);
  if (!size) {
    throw new Error(`Missing measured size for node ${node.id}`);
  }

  if (node.kind === "leaf") {
    out.push(toLeafFlowNode(harness, node, position, size, index, parentId));
    return;
  }

  out.push(toContainerFlowNode(harness, node, position, size, index, parentId));

  const kids = childrenOf(harness.nodes, node.id);
  const headerHeight = containerChromeHeaderHeight({
    hasAdvisoryCues: cuesFor(node.id, index).length > 0,
  });
  let y = headerHeight + FLOW_LAYOUT.containerPadY;
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
      index,
      out,
    );
    y += childSize.height + FLOW_LAYOUT.childGap;
  }
}

/**
 * Convert a harness graph into React Flow nodes with parent/child
 * containment. The harness itself is the outer boundary node; top-level
 * graph nodes sit in its body left-to-right.
 */
export function harnessToFlowNodes(harness: Harness): HarnessFlowNode[] {
  const index = buildWorkPoolNodeIndex(harness);
  const roots = harness.nodes.filter((node) => node.parentId === undefined);
  const sizes = new Map<NodeId, Size>();
  const rootSizes = roots.map((root) =>
    measureTree(harness, root, sizes, index),
  );
  const shellSize = measureHarnessShell(rootSizes);

  const out: HarnessFlowNode[] = [
    toHarnessBoundaryFlowNode(harness, shellSize),
  ];
  let x = FLOW_LAYOUT.containerPadX;
  const y = FLOW_LAYOUT.harnessHeaderHeight + FLOW_LAYOUT.containerPadY;
  for (const root of roots) {
    const size = sizes.get(root.id);
    if (!size) {
      throw new Error(`Missing measured size for root ${root.id}`);
    }
    positionSubtree(
      harness,
      root,
      { x, y },
      HARNESS_FLOW_NODE_ID,
      sizes,
      index,
      out,
    );
    x += size.width + FLOW_LAYOUT.topLevelGap;
  }

  return out;
}

/** React Flow edges for harness data wires, exec control, and fan-out append. */
export function harnessToFlowEdges(harness: Harness): FlowEdge[] {
  const index = buildAppendIndex(harness);

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

  const appendEdges = index.appenders.map(toAppendFlowEdge);

  return [...dataEdges, ...execEdges, ...appendEdges];
}
