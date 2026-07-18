import {
  Background,
  ConnectionLineType,
  Controls,
  ReactFlow,
  type Edge,
  type IsValidConnection,
  type OnConnect,
  type OnEdgesDelete,
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
      onNodesChange={onNodesChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onEdgesChange={() => {
        /* Edges are derived from harness data wires / appendsTo. */
      }}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onSelectionChange={handleSelectionChange}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      deleteKeyCode={["Backspace", "Delete"]}
      fitView={nodes.length > 0}
      nodesDraggable
      nodesConnectable
      elementsSelectable
      edgesFocusable
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
