import { useCallback, useMemo, useState } from "react";
import type {
  Connection,
  Edge as FlowEdge,
  IsValidConnection,
  OnEdgesDelete,
  OnNodesDelete,
} from "@xyflow/react";

import { useCanvasSelection } from "@/authoring/useCanvasSelection";
import { useContainmentDragDraft } from "@/authoring/useContainmentDragDraft";
import { useFlowPlacement } from "@/authoring/useFlowPlacement";
import { connectionEndpoints } from "@/components/canvas/connectionAdapter";
import { flowEdgeToInspectorView } from "@/components/canvas/flowEdgeInspector";
import { HarnessCanvas } from "@/components/canvas/HarnessCanvas";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import {
  harnessToFlowEdges,
  harnessToFlowNodes,
} from "@/components/canvas/harnessToFlow";
import {
  NodeInspector,
  type InspectorTarget,
} from "@/components/inspector/NodeInspector";
import type { AppendTarget } from "@/components/inspector/StructuralParams";
import { NodePalette } from "@/components/palette/NodePalette";
import { CATALOG_PALETTE_GROUPS } from "@/components/palette/catalogPalette";
import {
  canConnectDataWire,
  connectDataWire,
  createBaseSeedHarness,
  deleteSelection,
  updateNode,
  type Harness,
  type NodeId,
  type NodeUpdate,
} from "@/model";

type EditorLayoutProps = {
  /** Override the default base seed (used by branching render tests). */
  initialHarness?: Harness;
  /** Seed canvas node selection (tests / controlled demos). */
  initialSelectedNodeIds?: string[];
  /** Seed canvas edge selection (tests / controlled demos). */
  initialSelectedEdgeIds?: string[];
};

export function EditorLayout({
  initialHarness,
  initialSelectedNodeIds = [],
  initialSelectedEdgeIds = [],
}: EditorLayoutProps = {}) {
  const [harness, setHarness] = useState(
    () => initialHarness ?? createBaseSeedHarness(),
  );
  const flowNodes = useMemo(() => harnessToFlowNodes(harness), [harness]);
  const flowEdges = useMemo(() => harnessToFlowEdges(harness), [harness]);

  const {
    canvasRef,
    onFlowInit,
    onAddCatalogNode,
    onCanvasDragOver,
    onCanvasDrop,
  } = useFlowPlacement(setHarness);

  const {
    nodes: draftNodes,
    onNodeDragStart,
    onNodesChange,
    onNodeDragStop,
  } = useContainmentDragDraft(flowNodes, setHarness);

  const {
    nodes,
    edges,
    selectedNodeIds,
    selectedEdgeIds,
    onSelectionChange,
    clearDeletedFromSelection,
  } = useCanvasSelection(
    draftNodes,
    flowEdges,
    initialSelectedNodeIds,
    initialSelectedEdgeIds,
  );

  const appendTargets = useMemo<AppendTarget[]>(
    () =>
      harness.nodes
        .filter(
          (node) => node.kind === "container" && node.source.kind === "live",
        )
        .map((node) => ({ id: node.id, title: node.title })),
    [harness],
  );

  const inspectorTarget = useMemo<InspectorTarget>(() => {
    const primaryId = selectedNodeIds[0];
    if (primaryId !== undefined) {
      if (primaryId === HARNESS_FLOW_NODE_ID) {
        return {
          kind: "harness",
          title: harness.title,
          ports: harness.boundary,
        };
      }
      const node = harness.nodes.find((entry) => entry.id === primaryId);
      return node ? { kind: "node", node } : null;
    }
    const edgeId = selectedEdgeIds[0];
    if (edgeId !== undefined) {
      const edge = flowEdges.find((entry) => entry.id === edgeId);
      if (edge) {
        const view = flowEdgeToInspectorView(edge);
        if (view) return { kind: "edge", edge: view };
      }
    }
    return null;
  }, [harness, selectedNodeIds, selectedEdgeIds, flowEdges]);

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const ends = connectionEndpoints(connection);
      if (!ends) return false;
      return canConnectDataWire(harness, ends.from, ends.to);
    },
    [harness],
  );

  const onConnect = useCallback((connection: Connection) => {
    const ends = connectionEndpoints(connection);
    if (!ends) return;
    setHarness((current) => {
      const next = connectDataWire(current, ends.from, ends.to);
      return next ?? current;
    });
  }, []);

  const onUpdateNode = useCallback((nodeId: NodeId, update: NodeUpdate) => {
    setHarness((current) => updateNode(current, nodeId, update));
  }, []);

  const applyDelete = useCallback(
    (selection: {
      nodeIds?: readonly NodeId[];
      edgeIds?: readonly string[];
    }) => {
      const nodeIds = (selection.nodeIds ?? []).filter(
        (id) => id !== HARNESS_FLOW_NODE_ID,
      );
      const edgeIds = selection.edgeIds ?? [];
      if (nodeIds.length === 0 && edgeIds.length === 0) return;
      setHarness((current) => deleteSelection(current, { nodeIds, edgeIds }));
      clearDeletedFromSelection(nodeIds, edgeIds);
    },
    [clearDeletedFromSelection],
  );

  const onNodesDelete = useCallback<OnNodesDelete>(
    (deleted) => {
      applyDelete({ nodeIds: deleted.map((node) => node.id) });
    },
    [applyDelete],
  );

  const onEdgesDelete = useCallback<OnEdgesDelete>(
    (deleted: FlowEdge[]) => {
      applyDelete({ edgeIds: deleted.map((edge) => edge.id) });
    },
    [applyDelete],
  );

  const onDeleteNode = useCallback(
    (nodeId: string) => {
      applyDelete({ nodeIds: [nodeId] });
    },
    [applyDelete],
  );

  const onDeleteEdge = useCallback(
    (edgeId: string) => {
      applyDelete({ edgeIds: [edgeId] });
    },
    [applyDelete],
  );

  return (
    <div
      className="grid h-full min-h-0 grid-cols-[14rem_1fr_16rem]"
      data-testid="editor-layout"
    >
      <NodePalette
        groups={CATALOG_PALETTE_GROUPS}
        onAddCatalogNode={onAddCatalogNode}
      />
      <section
        ref={canvasRef}
        className="relative min-h-0 min-w-0"
        data-testid="editor-canvas"
        onDragOver={onCanvasDragOver}
        onDrop={onCanvasDrop}
      >
        <HarnessCanvas
          nodes={nodes}
          edges={edges}
          onInit={onFlowInit}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onSelectionChange={onSelectionChange}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
        />
      </section>
      <NodeInspector
        target={inspectorTarget}
        onDeleteNode={onDeleteNode}
        onUpdateNode={onUpdateNode}
        onDeleteEdge={onDeleteEdge}
        appendTargets={appendTargets}
      />
    </div>
  );
}
