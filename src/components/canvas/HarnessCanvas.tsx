import {
  Background,
  ConnectionLineType,
  Controls,
  ReactFlow,
  type Edge,
  type IsValidConnection,
  type OnConnect,
  type OnEdgesDelete,
  type OnInit,
  type OnNodeDrag,
  type OnNodesChange,
  type OnNodesDelete,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import { harnessNodeTypes } from "@/components/canvas/nodeTypes";

export type CanvasSelection = {
  nodeIds: string[];
  edgeIds: string[];
};

type HarnessCanvasProps = {
  nodes: HarnessFlowNode[];
  edges: Edge[];
  onNodesChange?: OnNodesChange<HarnessFlowNode>;
  onNodeDragStart?: OnNodeDrag<HarnessFlowNode>;
  onNodeDragStop?: OnNodeDrag<HarnessFlowNode>;
  onConnect?: OnConnect;
  isValidConnection?: IsValidConnection;
  onSelectionChange?: (selection: CanvasSelection) => void;
  onNodesDelete?: OnNodesDelete;
  onEdgesDelete?: OnEdgesDelete;
  onInit?: OnInit<HarnessFlowNode, Edge>;
  /** When true, block drag / connect / delete (Run mode). */
  readOnly?: boolean;
};

export function HarnessCanvas({
  nodes,
  edges,
  onNodesChange,
  onNodeDragStart,
  onNodeDragStop,
  onConnect,
  isValidConnection,
  onSelectionChange,
  onNodesDelete,
  onEdgesDelete,
  onInit,
  readOnly = false,
}: HarnessCanvasProps) {
  const handleSelectionChange: OnSelectionChangeFunc = ({
    nodes: selectedNodes,
    edges: selectedEdges,
  }) => {
    onSelectionChange?.({
      nodeIds: selectedNodes.map((node) => node.id),
      edgeIds: selectedEdges.map((edge) => edge.id),
    });
  };

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
      onEdgesChange={() => {
        /* Edges are derived from harness data wires / appendsTo. */
      }}
      onConnect={readOnly ? undefined : onConnect}
      isValidConnection={isValidConnection}
      onSelectionChange={handleSelectionChange}
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
    </ReactFlow>
  );
}
