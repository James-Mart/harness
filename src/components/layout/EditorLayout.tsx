import { useCallback, useMemo, useState, type DragEvent } from "react";
import type { Connection, IsValidConnection } from "@xyflow/react";

import { readCatalogDragType } from "@/authoring/catalogDrag";
import { useContainmentDragDraft } from "@/authoring/useContainmentDragDraft";
import { connectionEndpoints } from "@/components/canvas/connectionAdapter";
import { HarnessCanvas } from "@/components/canvas/HarnessCanvas";
import {
  harnessToFlowEdges,
  harnessToFlowNodes,
} from "@/components/canvas/harnessToFlow";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { NodePalette } from "@/components/palette/NodePalette";
import { CATALOG_PALETTE_GROUPS } from "@/components/palette/catalogPalette";
import {
  addCatalogNode,
  canConnectDataWire,
  connectDataWire,
  createBaseSeedHarness,
  type CatalogType,
  type Harness,
} from "@/model";

type EditorLayoutProps = {
  /** Override the default base seed (used by branching render tests). */
  initialHarness?: Harness;
};

export function EditorLayout({ initialHarness }: EditorLayoutProps = {}) {
  const [harness, setHarness] = useState(
    () => initialHarness ?? createBaseSeedHarness(),
  );
  const flowNodes = useMemo(() => harnessToFlowNodes(harness), [harness]);
  const flowEdges = useMemo(() => harnessToFlowEdges(harness), [harness]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { nodes, onNodeDragStart, onNodesChange, onNodeDragStop } =
    useContainmentDragDraft(flowNodes, selectedNodeId, setHarness);

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const ends = connectionEndpoints(connection);
      if (!ends) return false;
      return canConnectDataWire(harness, ends.from, ends.to);
    },
    [harness],
  );

  const onConnect = useCallback((connection: Connection) => {
    const ends = connectionEndpoints(connection);
    if (!ends) return;
    setHarness((current) => {
      const next = connectDataWire(current, ends.from, ends.to);
      return next ?? current;
    });
  }, []);

  const onAddCatalogNode = useCallback((type: CatalogType) => {
    setHarness((current) => addCatalogNode(current, type));
  }, []);

  const onCanvasDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onCanvasDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = readCatalogDragType(event.dataTransfer);
      if (type) onAddCatalogNode(type);
    },
    [onAddCatalogNode],
  );

  return (
    <div
      className="grid h-full min-h-0 grid-cols-[14rem_1fr_16rem]"
      data-testid="editor-layout"
    >
      <NodePalette
        groups={CATALOG_PALETTE_GROUPS}
        onAddCatalogNode={onAddCatalogNode}
      />
      <section
        className="relative min-h-0 min-w-0"
        data-testid="editor-canvas"
        onDragOver={onCanvasDragOver}
        onDrop={onCanvasDrop}
      >
        <HarnessCanvas
          nodes={nodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onSelectionChange={setSelectedNodeId}
        />
      </section>
      <NodeInspector selectedNodeId={selectedNodeId} />
    </div>
  );
}
