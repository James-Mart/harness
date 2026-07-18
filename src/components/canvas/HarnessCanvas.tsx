import {
  Background,
  ConnectionLineType,
  Controls,
  ReactFlow,
  type Edge,
  type IsValidConnection,
  type OnConnect,
  type OnNodeDrag,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import { harnessNodeTypes } from "@/components/canvas/nodeTypes";

type HarnessCanvasProps = {
  nodes: HarnessFlowNode[];
  edges: Edge[];
  onNodesChange?: OnNodesChange<HarnessFlowNode>;
  onNodeDragStart?: OnNodeDrag<HarnessFlowNode>;
  onNodeDragStop?: OnNodeDrag<HarnessFlowNode>;
  onConnect?: OnConnect;
  isValidConnection?: IsValidConnection;
  onSelectionChange?: (nodeId: string | null) => void;
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
}: HarnessCanvasProps) {
  const handleSelectionChange: OnSelectionChangeFunc = ({
    nodes: selected,
  }) => {
    onSelectionChange?.(selected[0]?.id ?? null);
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
        /* Edges are derived from harness data wires. */
      }}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onSelectionChange={handleSelectionChange}
      fitView={nodes.length > 0}
      nodesDraggable
      nodesConnectable
      edgesFocusable={false}
      elementsSelectable
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
