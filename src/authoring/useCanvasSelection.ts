import { useCallback, useMemo, useState } from "react";
import type { Edge, EdgeChange, NodeChange } from "@xyflow/react";

import type { HarnessFlowNode } from "@/components/canvas/flowTypes";

function sameIdList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

/** Apply RF `select` changes onto an id list, preserving survivor order. */
export function applySelectChangesToIds(
  current: readonly string[],
  changes: readonly { id: string; selected: boolean }[],
): string[] {
  if (changes.length === 0) return current as string[];

  const selected = new Set(current);
  for (const change of changes) {
    if (change.selected) selected.add(change.id);
    else selected.delete(change.id);
  }

  const preserved = current.filter((id) => selected.has(id));
  const preservedSet = new Set(preserved);
  const added: string[] = [];
  for (const change of changes) {
    if (!change.selected || preservedSet.has(change.id)) continue;
    if (added.includes(change.id)) continue;
    added.push(change.id);
  }
  const next = [...preserved, ...added];
  return sameIdList(current, next) ? (current as string[]) : next;
}

function selectChangesFrom(
  changes: readonly { type: string; id?: string; selected?: boolean }[],
): { id: string; selected: boolean }[] {
  return changes.flatMap((change) =>
    change.type === "select" && change.id !== undefined
      ? [{ id: change.id, selected: !!change.selected }]
      : [],
  );
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

type DelegateOnNodesChange = (changes: NodeChange<HarnessFlowNode>[]) => void;

/**
 * Controlled React Flow selection for nodes and edges. Stamps `selected`
 * flags and keeps state identity stable when the same selection re-applies
 * (avoids a controlled-selection setState loop).
 *
 * Owns click selection exclusively via RF `select` changes on the composed
 * `onNodesChange` / `onEdgesChange` handlers. The drag-draft delegate still
 * receives the full node change stream (idle draft ignores non-drag batches).
 */
export function useCanvasSelection(
  flowNodes: HarnessFlowNode[],
  flowEdges: Edge[],
  delegateOnNodesChange: DelegateOnNodesChange,
  initialSelectedNodeIds: readonly string[] = [],
  initialSelectedEdgeIds: readonly string[] = [],
): {
  nodes: HarnessFlowNode[];
  edges: Edge[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  onNodesChange: (changes: NodeChange<HarnessFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
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

  const onNodesChange = useCallback(
    (changes: NodeChange<HarnessFlowNode>[]) => {
      const selectChanges = selectChangesFrom(changes);
      if (selectChanges.length > 0) {
        setSelectedNodeIds((current) =>
          applySelectChangesToIds(current, selectChanges),
        );
      }
      delegateOnNodesChange(changes);
    },
    [delegateOnNodesChange],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Structural edge edits are derived from harness wires; only fold select.
    const selectChanges = selectChangesFrom(changes);
    if (selectChanges.length === 0) return;
    setSelectedEdgeIds((current) =>
      applySelectChangesToIds(current, selectChanges),
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
    onNodesChange,
    onEdgesChange,
    clearDeletedFromSelection,
  };
}
