import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  applyNodeChanges,
  type NodeChange,
  type OnNodeDrag,
} from "@xyflow/react";

import { resolveContainmentParent } from "@/authoring/containment";
import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import { reparentNode, type Harness } from "@/model";

function withSelection(
  nodes: HarnessFlowNode[],
  selectedNodeId: string | null,
): HarnessFlowNode[] {
  return nodes.map((node) => ({
    ...node,
    selected: node.id === selectedNodeId,
  }));
}

/**
 * Ephemeral React Flow positions during a node drag, committed to harness
 * containment on drag-stop.
 */
export function useContainmentDragDraft(
  flowNodes: HarnessFlowNode[],
  selectedNodeId: string | null,
  setHarness: Dispatch<SetStateAction<Harness>>,
): {
  nodes: HarnessFlowNode[];
  onNodeDragStart: OnNodeDrag<HarnessFlowNode>;
  onNodesChange: (changes: NodeChange<HarnessFlowNode>[]) => void;
  onNodeDragStop: OnNodeDrag<HarnessFlowNode>;
} {
  const [dragNodes, setDragNodes] = useState<HarnessFlowNode[] | null>(null);

  const nodes = useMemo(
    () => withSelection(dragNodes ?? flowNodes, selectedNodeId),
    [dragNodes, flowNodes, selectedNodeId],
  );

  const onNodeDragStart = useCallback<OnNodeDrag<HarnessFlowNode>>(() => {
    setDragNodes(withSelection(flowNodes, selectedNodeId));
  }, [flowNodes, selectedNodeId]);

  const onNodesChange = useCallback(
    (changes: NodeChange<HarnessFlowNode>[]) => {
      const positionChanges = changes.filter(
        (change) => change.type === "position",
      );
      if (positionChanges.length === 0) return;
      setDragNodes((current) => {
        if (current === null) return current;
        return applyNodeChanges(positionChanges, current);
      });
    },
    [],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<HarnessFlowNode>>(
    (_event, node) => {
      // Controlled positions live in dragNodes — not RF's callback node list.
      const geometry = dragNodes ?? withSelection(flowNodes, selectedNodeId);
      const parentId = resolveContainmentParent(node.id, geometry);
      setHarness((current) => reparentNode(current, node.id, parentId));
      setDragNodes(null);
    },
    [dragNodes, flowNodes, selectedNodeId, setHarness],
  );

  return { nodes, onNodeDragStart, onNodesChange, onNodeDragStop };
}
