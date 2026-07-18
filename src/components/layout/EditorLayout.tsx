import { useMemo, useState } from "react";

import { HarnessCanvas } from "@/components/canvas/HarnessCanvas";
import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { NodePalette } from "@/components/palette/NodePalette";
import { CATALOG_PALETTE_GROUPS } from "@/components/palette/catalogPalette";
import { createBaseSeedHarness } from "@/model";

export function EditorLayout() {
  const [harness] = useState(() => createBaseSeedHarness());
  const flowNodes = useMemo(() => harnessToFlowNodes(harness), [harness]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodes = useMemo(
    () =>
      flowNodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      })),
    [flowNodes, selectedNodeId],
  );

  return (
    <div
      className="grid h-full min-h-0 grid-cols-[14rem_1fr_16rem]"
      data-testid="editor-layout"
    >
      <NodePalette groups={CATALOG_PALETTE_GROUPS} />
      <section className="relative min-h-0 min-w-0" data-testid="editor-canvas">
        <HarnessCanvas nodes={nodes} onSelectionChange={setSelectedNodeId} />
      </section>
      <NodeInspector selectedNodeId={selectedNodeId} />
    </div>
  );
}
