import {
  Background,
  Controls,
  ReactFlow,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import { harnessNodeTypes } from "@/components/canvas/nodeTypes";

type HarnessCanvasProps = {
  nodes: HarnessFlowNode[];
  onSelectionChange?: (nodeId: string | null) => void;
};

export function HarnessCanvas({
  nodes,
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
      nodeTypes={harnessNodeTypes}
      onNodesChange={() => {
        /* Static canvas: graph comes from the harness model. */
      }}
      onSelectionChange={handleSelectionChange}
      fitView={nodes.length > 0}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
