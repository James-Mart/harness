import { useCallback, useMemo, useState } from "react";
import type { Edge } from "@xyflow/react";

import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import type { CanvasSelection } from "@/components/canvas/HarnessCanvas";

function sameIdList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

type Selectable = { id: string; selected?: boolean };

/**
 * Stamp `selected` without allocating a new object when the flag is
 * unchanged. RF treats a new node/edge identity without `measured` as a
 * re-init, so every drag-frame remap must preserve references for
 * untouched items.
 */
export function stampSelectedPreservingIdentity<T extends Selectable>(
  items: T[],
  selectedIds: readonly string[],
): T[] {
  const selected = new Set(selectedIds);
  let changed = false;
  const next = items.map((item) => {
    const isSelected = selected.has(item.id);
    if (!!item.selected === isSelected) {
      return item;
    }
    changed = true;
    return { ...item, selected: isSelected };
  });
  return changed ? next : items;
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
  initialSelectedEdgeIds: readonly string[] = [],
): {
  nodes: HarnessFlowNode[];
  edges: Edge[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  onSelectionChange: (selection: CanvasSelection) => void;
  clearDeletedFromSelection: (
    nodeIds: readonly string[],
    edgeIds: readonly string[],
  ) => void;
} {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(() => [
    ...initialSelectedNodeIds,
  ]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>(() => [
    ...initialSelectedEdgeIds,
  ]);

  const nodes = useMemo(
    () => stampSelectedPreservingIdentity(flowNodes, selectedNodeIds),
    [flowNodes, selectedNodeIds],
  );
  const edges = useMemo(
    () => stampSelectedPreservingIdentity(flowEdges, selectedEdgeIds),
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
    selectedEdgeIds,
    onSelectionChange,
    clearDeletedFromSelection,
  };
}
