import { MarkerType } from "@xyflow/react";

import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import type {
  ContainerFlowNode,
  HarnessBoundaryFlowNode,
  HarnessFlowEdge,
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
import { effectiveConcurrency, isGateEnabled } from "@/model/readySet";
import type {
  Harness,
  LeafNode,
  Node as HarnessNode,
  NodeId,
  NodePosition,
  Port,
} from "@/model/types";
import type { AdvisoryCue } from "@/model/advisoryCueTypes";
import { wiringAdvisoryCues } from "@/model/validationCues";
import { dataEdgeId, findPort } from "@/model/wiring";
import { workPoolAdvisoryCues } from "@/model/workpoolGraph";

type Size = { width: number; height: number };

/** Append / fan-out index — enough for edges and leaf/container mapping. */
type AppendIndex = {
  byId: Map<NodeId, HarnessNode>;
  fanOutTargets: Set<NodeId>;
  appenders: Array<LeafNode & { appendsTo: NodeId }>;
};

/** Node conversion index — append data plus precomputed advisory cues. */
type FlowNodeIndex = AppendIndex & {
  advisoryCuesByNode: Map<NodeId, readonly AdvisoryCue[]>;
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

function buildFlowNodeIndex(harness: Harness): FlowNodeIndex {
  const wiring = wiringAdvisoryCues(harness);
  const workPool = workPoolAdvisoryCues(harness);
  const advisoryCuesByNode = new Map<NodeId, readonly AdvisoryCue[]>();
  for (const id of new Set([...wiring.keys(), ...workPool.keys()])) {
    advisoryCuesByNode.set(id, [
      ...(wiring.get(id) ?? []),
      ...(workPool.get(id) ?? []),
    ]);
  }
  return {
    ...buildAppendIndex(harness),
    advisoryCuesByNode,
  };
}

function cuesFor(
  nodeId: NodeId,
  index: FlowNodeIndex,
): readonly AdvisoryCue[] {
  return index.advisoryCuesByNode.get(nodeId) ?? [];
}

function childrenOf(nodes: HarnessNode[], parentId: string): HarnessNode[] {
  return nodes.filter((node) => node.parentId === parentId);
}

function leafSize(
  ports: readonly Port[],
  execOutCount: number,
  options: { hasFanOutMarker?: boolean; hasAdvisoryCues?: boolean } = {},
): Size {
  const { inputs, outputs } = portsByDirection(ports);
  return {
    width: FLOW_LAYOUT.leafWidth,
    height: leafHeightForPortCount(
      Math.max(inputs.length, outputs.length),
      execOutCount,
      options,
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
  index: FlowNodeIndex,
): Size {
  if (node.kind === "leaf") {
    const execOutCount = Math.max(
      1,
      execOutBranchesForNode(harness, node).length,
    );
    const size = leafSize(node.ports, execOutCount, {
      hasFanOutMarker: node.appendsTo !== undefined,
      hasAdvisoryCues: cuesFor(node.id, index).length > 0,
    });
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

/** Size of the harness shell wrapping auto-layout top-level nodes L→R. */
function measureHarnessShell(rootSizes: Size[]): Size {
  return wrapWithHeaderChrome(
    aggregateChildContent(rootSizes, "horizontal"),
    FLOW_LAYOUT.harnessHeaderHeight,
  );
}

/** Grow the shell so a manually-placed root stays inside the boundary frame. */
function expandShellForPlacement(
  shell: Size,
  position: NodePosition,
  size: Size,
): Size {
  return {
    width: Math.max(
      shell.width,
      position.x + size.width + FLOW_LAYOUT.containerPadX,
    ),
    height: Math.max(
      shell.height,
      position.y + size.height + FLOW_LAYOUT.containerPadY,
    ),
  };
}

function toLeafFlowNode(
  harness: Harness,
  node: Extract<HarnessNode, { kind: "leaf" }>,
  position: NodePosition,
  size: Size,
  index: FlowNodeIndex,
  parentId?: string,
): LeafFlowNode {
  const appendTarget =
    node.appendsTo === undefined ? undefined : index.byId.get(node.appendsTo);

  return {
    id: node.id,
    type: "leaf",
    position,
    ...(parentId !== undefined ? { parentId } : {}),
    data: {
      title: node.title,
      catalogType: node.type,
      ports: node.ports,
      execOutBranches: execOutBranchesForNode(harness, node),
      advisoryCues: cuesFor(node.id, index),
      ...(node.isGate
        ? {
            isGate: true,
            gateEnabled: isGateEnabled(harness.runConfig, node.id),
          }
        : {}),
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
  position: NodePosition,
  size: Size,
  index: FlowNodeIndex,
  parentId?: string,
): ContainerFlowNode {
  return {
    id: node.id,
    type: "container",
    position,
    ...(parentId !== undefined ? { parentId } : {}),
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
    draggable: false,
    deletable: false,
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
  position: NodePosition,
  parentId: string | undefined,
  sizes: Map<NodeId, Size>,
  index: FlowNodeIndex,
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
  const index = buildFlowNodeIndex(harness);
  const roots = harness.nodes.filter((node) => node.parentId === undefined);
  const sizes = new Map<NodeId, Size>();
  for (const root of roots) {
    measureTree(harness, root, sizes, index);
  }

  const sizeOf = (id: NodeId): Size => {
    const size = sizes.get(id);
    if (!size) throw new Error(`Missing measured size for root ${id}`);
    return size;
  };

  // Manually-placed roots use their persisted position; the rest flow L→R.
  const placedRoots = roots.filter((root) => root.position !== undefined);
  const autoRoots = roots.filter((root) => root.position === undefined);

  let shellSize = measureHarnessShell(autoRoots.map((root) => sizeOf(root.id)));
  for (const root of placedRoots) {
    shellSize = expandShellForPlacement(
      shellSize,
      root.position!,
      sizeOf(root.id),
    );
  }

  const out: HarnessFlowNode[] = [
    toHarnessBoundaryFlowNode(harness, shellSize),
  ];

  // Auto-layout x advances only across auto roots so placed roots cannot
  // steal slots and overlap L→R siblings.
  const autoPositionById = new Map<NodeId, NodePosition>();
  let x = FLOW_LAYOUT.containerPadX;
  const y = FLOW_LAYOUT.harnessHeaderHeight + FLOW_LAYOUT.containerPadY;
  for (const root of autoRoots) {
    autoPositionById.set(root.id, { x, y });
    x += sizeOf(root.id).width + FLOW_LAYOUT.topLevelGap;
  }

  for (const root of roots) {
    const position = root.position ?? autoPositionById.get(root.id);
    if (!position) {
      throw new Error(`Missing layout position for root ${root.id}`);
    }
    positionSubtree(
      harness,
      root,
      position,
      HARNESS_FLOW_NODE_ID,
      sizes,
      index,
      out,
    );
  }

  return out;
}

/** React Flow edges for harness data wires, exec control, and fan-out append. */
export function harnessToFlowEdges(harness: Harness): HarnessFlowEdge[] {
  const index = buildAppendIndex(harness);

  const dataEdges: HarnessFlowEdge[] = harness.edges
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

  const execEdges: HarnessFlowEdge[] = harness.edges
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
