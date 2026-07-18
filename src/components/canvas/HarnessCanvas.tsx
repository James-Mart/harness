import {
  Background,
  Controls,
  ReactFlow,
  type Node,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type HarnessCanvasProps = {
  nodes: Node[];
  onNodesChange: OnNodesChange;
  onSelectionChange?: (nodeId: string | null) => void;
};

export function HarnessCanvas({
  nodes,
  onNodesChange,
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
      onNodesChange={onNodesChange}
      onSelectionChange={handleSelectionChange}
      fitView={nodes.length > 0}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
