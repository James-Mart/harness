import { useCallback, useMemo, useState } from "react";
import type { Edge } from "@xyflow/react";

import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import type { CanvasSelection } from "@/components/canvas/HarnessCanvas";

function sameIdList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function withNodeSelection(
  nodes: HarnessFlowNode[],
  selectedNodeIds: readonly string[],
): HarnessFlowNode[] {
  const selected = new Set(selectedNodeIds);
  return nodes.map((node) => ({
    ...node,
    selected: selected.has(node.id),
  }));
}

function withEdgeSelection(
  edges: Edge[],
  selectedEdgeIds: readonly string[],
): Edge[] {
  const selected = new Set(selectedEdgeIds);
  return edges.map((edge) => ({
    ...edge,
    selected: selected.has(edge.id),
  }));
}

/**
 * Controlled React Flow selection for nodes and edges. Stamps `selected`
 * flags and keeps state identity stable when RF re-emits the same selection
 * (avoids a controlled-selection setState loop).
 */
export function useCanvasSelection(
  flowNodes: HarnessFlowNode[],
  flowEdges: Edge[],
  initialSelectedNodeIds: readonly string[] = [],
): {
  nodes: HarnessFlowNode[];
  edges: Edge[];
  selectedNodeIds: string[];
  onSelectionChange: (selection: CanvasSelection) => void;
  clearDeletedFromSelection: (
    nodeIds: readonly string[],
    edgeIds: readonly string[],
  ) => void;
} {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(() => [
    ...initialSelectedNodeIds,
  ]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const nodes = useMemo(
    () => withNodeSelection(flowNodes, selectedNodeIds),
    [flowNodes, selectedNodeIds],
  );
  const edges = useMemo(
    () => withEdgeSelection(flowEdges, selectedEdgeIds),
    [flowEdges, selectedEdgeIds],
  );

  const onSelectionChange = useCallback((selection: CanvasSelection) => {
    setSelectedNodeIds((current) =>
      sameIdList(current, selection.nodeIds) ? current : selection.nodeIds,
    );
    setSelectedEdgeIds((current) =>
      sameIdList(current, selection.edgeIds) ? current : selection.edgeIds,
    );
  }, []);

  const clearDeletedFromSelection = useCallback(
    (nodeIds: readonly string[], edgeIds: readonly string[]) => {
      const removedNodes = new Set(nodeIds);
      const removedEdges = new Set(edgeIds);
      setSelectedNodeIds((current) =>
        current.filter((id) => !removedNodes.has(id)),
      );
      setSelectedEdgeIds((current) =>
        current.filter((id) => !removedEdges.has(id)),
      );
    },
    [],
  );

  return {
    nodes,
    edges,
    selectedNodeIds,
    onSelectionChange,
    clearDeletedFromSelection,
  };
}
