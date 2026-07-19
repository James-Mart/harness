import {
  Background,
  ConnectionLineType,
  Controls,
  ReactFlow,
  type Edge,
  type EdgeChange,
  type IsValidConnection,
  type OnConnect,
  type OnEdgesDelete,
  type OnInit,
  type OnNodeDrag,
  type OnNodesChange,
  type OnNodesDelete,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import { harnessNodeTypes } from "@/components/canvas/nodeTypes";
import { RunOverlay } from "@/components/canvas/RunOverlay";
import type { RunState } from "@/sim";

type HarnessCanvasProps = {
  nodes: HarnessFlowNode[];
  edges: Edge[];
  onNodesChange?: OnNodesChange<HarnessFlowNode>;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onNodeDragStart?: OnNodeDrag<HarnessFlowNode>;
  onNodeDragStop?: OnNodeDrag<HarnessFlowNode>;
  onConnect?: OnConnect;
  isValidConnection?: IsValidConnection;
  onNodesDelete?: OnNodesDelete;
  onEdgesDelete?: OnEdgesDelete;
  onInit?: OnInit<HarnessFlowNode, Edge>;
  /** When true, block drag / connect / delete (Run mode). */
  readOnly?: boolean;
  /** Live mock run state; drives the Run-mode cursor overlay. */
  runState?: RunState | null;
};

export function HarnessCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeDragStart,
  onNodeDragStop,
  onConnect,
  isValidConnection,
  onNodesDelete,
  onEdgesDelete,
  onInit,
  readOnly = false,
  runState = null,
}: HarnessCanvasProps) {
  return (
    <ReactFlow
      className="h-full w-full"
      nodes={nodes}
      edges={edges}
      nodeTypes={harnessNodeTypes}
      onInit={onInit}
      onNodesChange={readOnly ? undefined : onNodesChange}
      onNodeDragStart={readOnly ? undefined : onNodeDragStart}
      onNodeDragStop={readOnly ? undefined : onNodeDragStop}
      onEdgesChange={readOnly ? undefined : onEdgesChange}
      onConnect={readOnly ? undefined : onConnect}
      isValidConnection={isValidConnection}
      onNodesDelete={readOnly ? undefined : onNodesDelete}
      onEdgesDelete={readOnly ? undefined : onEdgesDelete}
      deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
      fitView={nodes.length > 0}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable
      edgesFocusable={!readOnly}
      connectionLineType={ConnectionLineType.Bezier}
      connectionLineStyle={{ strokeWidth: 2 }}
      defaultEdgeOptions={{ type: "default" }}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} />
      <Controls showInteractive={false} />
      {runState != null ? (
        <RunOverlay runState={runState} nodes={nodes} />
      ) : null}
    </ReactFlow>
  );
}
