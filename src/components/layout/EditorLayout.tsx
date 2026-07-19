import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  useRunSimulation,
  type EditorMode,
} from "@/authoring/useRunSimulation";
import { connectionEndpoints } from "@/components/canvas/connectionAdapter";
import { flowEdgeToInspectorView } from "@/components/canvas/flowEdgeInspector";
import { HarnessCanvas } from "@/components/canvas/HarnessCanvas";
import {
  harnessToFlowEdges,
  harnessToFlowNodes,
} from "@/components/canvas/harnessToFlow";
import {
  NodeInspector,
  type InspectorTarget,
} from "@/components/inspector/NodeInspector";
import type { AppendTarget } from "@/components/inspector/StructuralParams";
import { RunControls } from "@/components/layout/RunControls";
import { NodePalette } from "@/components/palette/NodePalette";
import { CATALOG_PALETTE_GROUPS } from "@/components/palette/catalogPalette";
import {
  canConnectDataWire,
  connectDataWire,
  createBaseSeedHarness,
  deleteSelection,
  updateNode,
  updateRunConfig,
  type Harness,
  type NodeId,
  type NodeUpdate,
  type RunConfigUpdate,
} from "@/model";
import type { RunState } from "@/sim";

type EditorLayoutProps = {
  /** Override the default base seed (used by branching render tests). */
  initialHarness?: Harness;
  /** Seed canvas node selection (tests / controlled demos). */
  initialSelectedNodeIds?: string[];
  /** Seed canvas edge selection (tests / controlled demos). */
  initialSelectedEdgeIds?: string[];
  /** Observes harness state (tests / demos). */
  onHarnessChange?: (harness: Harness) => void;
  /** Observes Edit/Run mode (tests / demos). */
  onModeChange?: (mode: EditorMode) => void;
  /** Observes mock run state (tests / overlay). */
  onRunStateChange?: (state: RunState | null) => void;
};

export function EditorLayout({
  initialHarness,
  initialSelectedNodeIds = [],
  initialSelectedEdgeIds = [],
  onHarnessChange,
  onModeChange,
  onRunStateChange,
}: EditorLayoutProps = {}) {
  const [harness, setHarness] = useState(
    () => initialHarness ?? createBaseSeedHarness(),
  );

  useEffect(() => {
    onHarnessChange?.(harness);
  }, [harness, onHarnessChange]);

  const {
    mode,
    setMode,
    speed,
    setSpeed,
    runState,
    onStep,
    onReset,
    canStep,
    readOnly,
  } = useRunSimulation({ harness, onModeChange, onRunStateChange });

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
    onNodesChange: onDragNodesChange,
    onNodeDragStop,
  } = useContainmentDragDraft(flowNodes, setHarness);

  const {
    nodes,
    edges,
    selectedNodeIds,
    selectedEdgeIds,
    onNodesChange,
    onEdgesChange,
    clearDeletedFromSelection,
  } = useCanvasSelection(
    draftNodes,
    flowEdges,
    onDragNodesChange,
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

  const onUpdateRunConfig = useCallback((update: RunConfigUpdate) => {
    setHarness((current) => updateRunConfig(current, update));
  }, []);

  const applyDelete = useCallback(
    (selection: {
      nodeIds?: readonly NodeId[];
      edgeIds?: readonly string[];
    }) => {
      const nodeIds = selection.nodeIds ?? [];
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
      className="flex h-full min-h-0 flex-col"
      data-testid="editor-layout"
      data-editor-mode={mode}
    >
      <RunControls
        mode={mode}
        onModeChange={setMode}
        onStep={onStep}
        onReset={onReset}
        canStep={canStep}
        speed={speed}
        onSpeedChange={setSpeed}
        status={runState?.status ?? null}
      />
      <div className="grid min-h-0 flex-1 grid-cols-[14rem_1fr_16rem]">
        <NodePalette
          groups={CATALOG_PALETTE_GROUPS}
          onAddCatalogNode={onAddCatalogNode}
          readOnly={readOnly}
        />
        <section
          ref={canvasRef}
          className="relative min-h-0 min-w-0"
          data-testid="editor-canvas"
          onDragOver={(event) => {
            if (readOnly) return;
            onCanvasDragOver(event);
          }}
          onDrop={(event) => {
            if (readOnly) return;
            onCanvasDrop(event);
          }}
        >
          <HarnessCanvas
            nodes={nodes}
            edges={edges}
            onInit={onFlowInit}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            readOnly={readOnly}
            runState={runState}
          />
        </section>
        <NodeInspector
          target={inspectorTarget}
          runConfig={harness.runConfig}
          onDeleteNode={onDeleteNode}
          onUpdateNode={onUpdateNode}
          onUpdateRunConfig={onUpdateRunConfig}
          onDeleteEdge={onDeleteEdge}
          appendTargets={appendTargets}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
