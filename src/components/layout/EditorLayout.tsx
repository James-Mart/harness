import { useState } from "react";
import { useNodesState, type Node } from "@xyflow/react";

import { HarnessCanvas } from "@/components/canvas/HarnessCanvas";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { NodePalette } from "@/components/palette/NodePalette";
import { PLACEHOLDER_PALETTE_GROUPS } from "@/components/palette/placeholderCatalog";

export function EditorLayout() {
  const [nodes, , onNodesChange] = useNodesState<Node>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <div
      className="grid h-full min-h-0 grid-cols-[14rem_1fr_16rem]"
      data-testid="editor-layout"
    >
      <NodePalette groups={PLACEHOLDER_PALETTE_GROUPS} />
      <section className="relative min-h-0 min-w-0" data-testid="editor-canvas">
        <HarnessCanvas
          nodes={nodes}
          onNodesChange={onNodesChange}
          onSelectionChange={setSelectedNodeId}
        />
      </section>
      <NodeInspector selectedNodeId={selectedNodeId} />
    </div>
  );
}
