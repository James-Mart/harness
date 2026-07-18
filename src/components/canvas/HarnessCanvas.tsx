import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "Hello Harness" },
  },
];

export function HarnessCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);

  return (
    <ReactFlow
      className="h-full w-full"
      nodes={nodes}
      onNodesChange={onNodesChange}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
