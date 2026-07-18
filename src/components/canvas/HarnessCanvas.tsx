import {
  Background,
  ConnectionLineType,
  Controls,
  ReactFlow,
  type Edge,
  type IsValidConnection,
  type OnConnect,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import { harnessNodeTypes } from "@/components/canvas/nodeTypes";

type HarnessCanvasProps = {
  nodes: HarnessFlowNode[];
  edges: Edge[];
  onConnect?: OnConnect;
  isValidConnection?: IsValidConnection;
  onSelectionChange?: (nodeId: string | null) => void;
};

export function HarnessCanvas({
  nodes,
  edges,
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
      onNodesChange={() => {
        /* Graph structure comes from the harness model. */
      }}
      onEdgesChange={() => {
        /* Edges are derived from harness data wires. */
      }}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onSelectionChange={handleSelectionChange}
      fitView={nodes.length > 0}
      nodesDraggable={false}
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
