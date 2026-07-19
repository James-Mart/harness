import { MarkerType } from "@xyflow/react";

import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import type {
  BodyHelperKind,
  ContainerFlowNode,
  HarnessBoundaryFlowNode,
  HarnessFlowEdge,
  HarnessFlowNode,
  HelperFlowNode,
  LeafFlowNode,
} from "@/components/canvas/flowTypes";
import {
  FLOW_LAYOUT,
  bodyChildrenOriginY,
  bodyHelperStripsHeight,
  bodyTopStripOrigin,
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
  distinctExecBranches,
  execEdgeId,
  execOutBranchesForNode,
  execOutHandleId,
  type ExecEdge,
} from "@/model/exec";
import { effectiveConcurrency, isGateEnabled } from "@/model/readySet";
import { tryGetCurrentItemPort } from "@/model/instantiate";
import {
  CURRENT_ITEM_PORT_ID,
  type Harness,
  type LeafNode,
  type Node as HarnessNode,
  type NodeId,
  type NodePosition,
  type Port,
} from "@/model/types";
import type { AdvisoryCue } from "@/model/advisoryCueTypes";
import { wiringAdvisoryCues } from "@/model/validationCues";
import { dataEdgeId, findPort } from "@/model/wiring";
import { workPoolAdvisoryCues } from "@/model/workpoolGraph";

export type {
  BodyHelperKind,
  HelperFlowData,
  HelperFlowNode,
} from "@/components/canvas/flowTypes";
export {
  bodyBottomStripOrigin,
  bodyTopStripOrigin,
} from "@/components/canvas/layoutTokens";

type Size = { width: number; height: number };

/** Stable React Flow id for a synthetic body-helper node. */
export function bodyHelperNodeId(bodyId: string, kind: BodyHelperKind): string {
  return `${bodyId}/$${kind}`;
}

const BODY_HELPER_KINDS: readonly BodyHelperKind[] = [
  "exec",
  "variables",
  "output",
];

/**
 * Parse a synthetic body-helper flow id (`${bodyId}/$kind`) back to its body
 * and kind. Returns `undefined` for ordinary model / shell node ids.
 */
export function parseBodyHelperNodeId(
  flowNodeId: string,
): { bodyId: string; kind: BodyHelperKind } | undefined {
  const sep = "/$";
  const index = flowNodeId.lastIndexOf(sep);
  if (index < 0) return undefined;
  const bodyId = flowNodeId.slice(0, index);
  const kind = flowNodeId.slice(index + sep.length);
  if (!BODY_HELPER_KINDS.includes(kind as BodyHelperKind)) return undefined;
  if (bodyId.length === 0) return undefined;
  return { bodyId, kind: kind as BodyHelperKind };
}

/**
 * Map a React Flow node id back to the harness model node id. Body-helper
 * nodes (`loop/$variables`, `$harness/$exec`, …) resolve to their body.
 */
export function modelNodeIdFromFlowNodeId(flowNodeId: string): string {
  return parseBodyHelperNodeId(flowNodeId)?.bodyId ?? flowNodeId;
}

/**
 * Synthetic, non-interactive helper node for a body strip. Not draggable,
 * deletable, or selectable (and never reparented — always `parentId = bodyId`).
 */
export function toHelperFlowNode(args: {
  bodyId: string;
  kind: BodyHelperKind;
  title: string;
  ports?: readonly Port[];
  execOutBranches?: readonly (string | undefined)[];
  position: NodePosition;
  size?: Size;
}): HelperFlowNode {
  const size = args.size ?? {
    width: FLOW_LAYOUT.helperNodeWidth,
    height: FLOW_LAYOUT.helperNodeHeight,
  };
  return {
    id: bodyHelperNodeId(args.bodyId, args.kind),
    type: "helper",
    position: args.position,
    parentId: args.bodyId,
    draggable: false,
    deletable: false,
    selectable: false,
    data: {
      kind: args.kind,
      title: args.title,
      ports: args.ports ?? [],
      ...(args.execOutBranches !== undefined
        ? { execOutBranches: [...args.execOutBranches] }
        : {}),
    },
    style: { width: size.width, height: size.height },
  };
}

/** Grow child-stack content by reserved top/bottom helper strips. */
function wrapChildContentWithHelperStrips(
  childContent: Size,
  topStripHeight: number = FLOW_LAYOUT.bodyTopStripHeight,
  bottomStripHeight: number = FLOW_LAYOUT.bodyBottomStripHeight,
  topStripMinWidth: number = FLOW_LAYOUT.helperNodeWidth,
): Size {
  const stripActive = topStripHeight > 0 || bottomStripHeight > 0;
  return {
    width: Math.max(childContent.width, stripActive ? topStripMinWidth : 0),
    height:
      childContent.height +
      bodyHelperStripsHeight(topStripHeight, bottomStripHeight),
  };
}

/** Present a container/harness input as a Variables output (outer → inner). */
function passThroughVariablesPort(port: Port): Port {
  return {
    id: port.id,
    name: port.name,
    direction: "out",
    schema: port.schema,
  };
}

/**
 * Output ports the Variables helper surfaces inside a container body.
 * Present only when there is at least one readable inner value:
 * `$currentItem` (iterating containers), then pass-through inputs in
 * port-declaration order (inputs other than the iterable feedstock).
 */
export function variablesPortsForContainer(
  node: Extract<HarnessNode, { kind: "container" }>,
): Port[] {
  const ports: Port[] = [];
  const currentItem = tryGetCurrentItemPort(node);
  if (currentItem !== undefined) {
    ports.push(currentItem);
  }
  for (const port of node.ports) {
    if (port.direction !== "in") continue;
    // Iterable feedstock drives `$currentItem`; it is not a pass-through.
    if (port.id === node.iterablePortId) continue;
    ports.push(passThroughVariablesPort(port));
  }
  return ports;
}

/** Outer chrome ports — body-internal sources (e.g. `$currentItem`) omitted. */
function outerContainerPorts(ports: readonly Port[]): Port[] {
  return ports.filter((port) => port.id !== CURRENT_ITEM_PORT_ID);
}

/** Size of a Variables helper (wide enough for `$currentItem · Type` labels). */
function variablesHelperSize(): Size {
  return {
    width: FLOW_LAYOUT.leafWidth,
    height: FLOW_LAYOUT.helperNodeHeight,
  };
}

/** Min width of the top strip given whether a Variables helper is present. */
function topStripMinWidth(hasVariables: boolean): number {
  if (!hasVariables) return FLOW_LAYOUT.helperNodeWidth;
  return (
    FLOW_LAYOUT.helperNodeWidth +
    FLOW_LAYOUT.childGap +
    variablesHelperSize().width
  );
}

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

function cuesFor(nodeId: NodeId, index: FlowNodeIndex): readonly AdvisoryCue[] {
  return index.advisoryCuesByNode.get(nodeId) ?? [];
}

function childrenOf(nodes: HarnessNode[], parentId: string): HarnessNode[] {
  return nodes.filter((node) => node.parentId === parentId);
}

type ContainerExecOutPartition = {
  bodyEntry: ExecEdge[];
  outer: ExecEdge[];
  bodyEntryBranches: (string | undefined)[];
  outerBranches: (string | undefined)[];
};

/**
 * Split a container's outgoing exec edges into body-entry (target is a direct
 * child) vs outer/sibling. Branch lists drive the Exec helper pins and the
 * container chrome outs from one classification.
 */
export function partitionContainerExecOuts(
  harness: Harness,
  containerId: NodeId,
): ContainerExecOutPartition {
  const childIds = new Set(
    childrenOf(harness.nodes, containerId).map((child) => child.id),
  );
  const outs = harness.edges.filter(
    (edge): edge is ExecEdge =>
      edge.kind === "exec" && edge.from === containerId,
  );
  const bodyEntry = outs.filter((edge) => childIds.has(edge.to));
  const outer = outs.filter((edge) => !childIds.has(edge.to));
  return {
    bodyEntry,
    outer,
    bodyEntryBranches: distinctExecBranches(bodyEntry),
    outerBranches: distinctExecBranches(outer),
  };
}

/** Outer exec-out slots for container chrome (sibling / post-body only). */
function outerExecOutBranchesFromPartition(
  harness: Harness,
  node: HarnessNode,
  partition: ContainerExecOutPartition,
): (string | undefined)[] {
  if (partition.outer.length > 0) return partition.outerBranches;
  // All outs enter the body — no outer sibling pin.
  if (partition.bodyEntry.length > 0) return [];
  // Nothing wired yet — keep the default authoring pin.
  return execOutBranchesForNode(harness, node);
}

function toExecHelperFlowNode(
  bodyId: string,
  headerHeight: number,
  bodyEntryBranches: readonly (string | undefined)[],
): HelperFlowNode {
  return toHelperFlowNode({
    bodyId,
    kind: "exec",
    title: "Exec",
    // Always at least one unbranched out when nothing enters the body yet.
    execOutBranches:
      bodyEntryBranches.length > 0 ? bodyEntryBranches : [undefined],
    position: bodyTopStripOrigin(headerHeight),
  });
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

/** Aggregate children, reserve helper strips, then wrap with header chrome. */
function measureBodyContent(
  childSizes: Size[],
  axis: "vertical" | "horizontal",
  headerHeight: number,
  stripMinWidth: number = FLOW_LAYOUT.helperNodeWidth,
): Size {
  return wrapWithHeaderChrome(
    wrapChildContentWithHelperStrips(
      aggregateChildContent(childSizes, axis),
      FLOW_LAYOUT.bodyTopStripHeight,
      FLOW_LAYOUT.bodyBottomStripHeight,
      stripMinWidth,
    ),
    headerHeight,
  );
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
  const hasVariables = variablesPortsForContainer(node).length > 0;
  const size = measureBodyContent(
    childSizes,
    "vertical",
    containerChromeHeaderHeight({
      hasAdvisoryCues: cuesFor(node.id, index).length > 0,
    }),
    topStripMinWidth(hasVariables),
  );
  sizes.set(node.id, size);
  return size;
}

/** Size of the harness shell wrapping auto-layout top-level nodes L→R. */
function measureHarnessShell(rootSizes: Size[]): Size {
  return measureBodyContent(
    rootSizes,
    "horizontal",
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
  outerExecOutBranches: readonly (string | undefined)[],
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
      ports: outerContainerPorts(node.ports),
      execOutBranches: [...outerExecOutBranches],
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

function toVariablesHelperFlowNode(
  bodyId: string,
  headerHeight: number,
  ports: readonly Port[],
): HelperFlowNode {
  const origin = bodyTopStripOrigin(headerHeight);
  const size = variablesHelperSize();
  return toHelperFlowNode({
    bodyId,
    kind: "variables",
    title: "Variables",
    ports,
    position: {
      x: origin.x + FLOW_LAYOUT.helperNodeWidth + FLOW_LAYOUT.childGap,
      y: origin.y,
    },
    size,
  });
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

  const kids = childrenOf(harness.nodes, node.id);
  const headerHeight = containerChromeHeaderHeight({
    hasAdvisoryCues: cuesFor(node.id, index).length > 0,
  });
  const partition = partitionContainerExecOuts(harness, node.id);
  const variablesPorts = variablesPortsForContainer(node);
  out.push(
    toContainerFlowNode(
      harness,
      node,
      position,
      size,
      index,
      outerExecOutBranchesFromPartition(harness, node, partition),
      parentId,
    ),
  );
  out.push(
    toExecHelperFlowNode(node.id, headerHeight, partition.bodyEntryBranches),
  );
  if (variablesPorts.length > 0) {
    out.push(toVariablesHelperFlowNode(node.id, headerHeight, variablesPorts));
  }
  let y = bodyChildrenOriginY(headerHeight);
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
    toExecHelperFlowNode(
      HARNESS_FLOW_NODE_ID,
      FLOW_LAYOUT.harnessHeaderHeight,
      partitionContainerExecOuts(harness, HARNESS_FLOW_NODE_ID)
        .bodyEntryBranches,
    ),
  ];

  // Auto-layout x advances only across auto roots so placed roots cannot
  // steal slots and overlap L→R siblings.
  const autoPositionById = new Map<NodeId, NodePosition>();
  let x = FLOW_LAYOUT.containerPadX;
  const y = bodyChildrenOriginY(FLOW_LAYOUT.harnessHeaderHeight);
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

/** Port ids each container surfaces on its Variables helper (empty if none). */
function variablesPortIdsByContainer(
  harness: Harness,
): Map<NodeId, ReadonlySet<string>> {
  const byContainer = new Map<NodeId, ReadonlySet<string>>();
  for (const node of harness.nodes) {
    if (node.kind !== "container") continue;
    const ports = variablesPortsForContainer(node);
    if (ports.length === 0) continue;
    byContainer.set(node.id, new Set(ports.map((port) => port.id)));
  }
  return byContainer;
}

/** React Flow edges for harness data wires, exec control, and fan-out append. */
export function harnessToFlowEdges(harness: Harness): HarnessFlowEdge[] {
  const index = buildAppendIndex(harness);
  const variablesPortsByContainer = variablesPortIdsByContainer(harness);

  const dataEdges: HarnessFlowEdge[] = harness.edges
    .filter((edge) => edge.kind === "data")
    .map((edge) => {
      const fromPort = findPort(harness, edge.from);
      const stroke = fromPort
        ? schemaAccent(fromPort.schema)
        : "var(--muted-foreground)";
      // Body-internal readable sources → Variables helper when that port is
      // surfaced there (`$currentItem` / pass-through inputs).
      const source = variablesPortsByContainer
        .get(edge.from.node)
        ?.has(edge.from.port)
        ? bodyHelperNodeId(edge.from.node, "variables")
        : edge.from.node;
      return {
        id: dataEdgeId(edge.from, edge.to),
        source,
        sourceHandle: edge.from.port,
        target: edge.to.node,
        targetHandle: edge.to.port,
        type: "default",
        style: { stroke, strokeWidth: 2 },
        data: { kind: "data" as const },
      };
    });

  const parentByNodeId = new Map(
    harness.nodes.map((node) => [node.id, node.parentId] as const),
  );

  const execEdges: HarnessFlowEdge[] = harness.edges
    .filter((edge): edge is ExecEdge => edge.kind === "exec")
    .map((edge) => {
      // Body-entry: source from the container's Exec helper; sibling edges
      // keep the container's outer exec-out. Child → child is unchanged.
      const source =
        parentByNodeId.get(edge.to) === edge.from
          ? bodyHelperNodeId(edge.from, "exec")
          : edge.from;
      return {
        id: execEdgeId(edge.from, edge.to, edge.branch),
        source,
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
      };
    });

  const appendEdges = index.appenders.map(toAppendFlowEdge);

  return [...dataEdges, ...execEdges, ...appendEdges];
}
