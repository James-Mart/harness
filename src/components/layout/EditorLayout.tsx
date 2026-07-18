import { useCallback, useMemo, useState, type DragEvent } from "react";
import type {
  Connection,
  Edge as FlowEdge,
  IsValidConnection,
  OnEdgesDelete,
  OnNodesDelete,
} from "@xyflow/react";

import { readCatalogDragType } from "@/authoring/catalogDrag";
import { useCanvasSelection } from "@/authoring/useCanvasSelection";
import { useContainmentDragDraft } from "@/authoring/useContainmentDragDraft";
import { connectionEndpoints } from "@/components/canvas/connectionAdapter";
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
import { NodePalette } from "@/components/palette/NodePalette";
import { CATALOG_PALETTE_GROUPS } from "@/components/palette/catalogPalette";
import {
  addCatalogNode,
  canConnectDataWire,
  connectDataWire,
  createBaseSeedHarness,
  deleteSelection,
  type CatalogType,
  type Harness,
  type NodeId,
} from "@/model";

type EditorLayoutProps = {
  /** Override the default base seed (used by branching render tests). */
  initialHarness?: Harness;
  /** Seed canvas selection (tests / controlled demos). */
  initialSelectedNodeIds?: string[];
};

export function EditorLayout({
  initialHarness,
  initialSelectedNodeIds = [],
}: EditorLayoutProps = {}) {
  const [harness, setHarness] = useState(
    () => initialHarness ?? createBaseSeedHarness(),
  );
  const flowNodes = useMemo(() => harnessToFlowNodes(harness), [harness]);
  const flowEdges = useMemo(() => harnessToFlowEdges(harness), [harness]);

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
    onSelectionChange,
    clearDeletedFromSelection,
  } = useCanvasSelection(draftNodes, flowEdges, initialSelectedNodeIds);

  const inspectorTarget = useMemo<InspectorTarget>(() => {
    const primaryId = selectedNodeIds[0];
    if (primaryId === undefined) return null;
    if (primaryId === HARNESS_FLOW_NODE_ID) {
      return {
        kind: "harness",
        title: harness.title,
        ports: harness.boundary,
      };
    }
    const node = harness.nodes.find((entry) => entry.id === primaryId);
    return node ? { kind: "node", node } : null;
  }, [harness, selectedNodeIds]);

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

  const onAddCatalogNode = useCallback((type: CatalogType) => {
    setHarness((current) => addCatalogNode(current, type));
  }, []);

  const onCanvasDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onCanvasDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = readCatalogDragType(event.dataTransfer);
      if (type) onAddCatalogNode(type);
    },
    [onAddCatalogNode],
  );

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
        className="relative min-h-0 min-w-0"
        data-testid="editor-canvas"
        onDragOver={onCanvasDragOver}
        onDrop={onCanvasDrop}
      >
        <HarnessCanvas
          nodes={nodes}
          edges={edges}
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
        onDeleteNode={
          inspectorTarget?.kind === "node" ? onDeleteNode : undefined
        }
      />
    </div>
  );
}
