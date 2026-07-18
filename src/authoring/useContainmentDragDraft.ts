import {
  useCallback,
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

/**
 * Ephemeral React Flow positions during a node drag, committed to harness
 * containment on drag-stop. Selection stamping is owned by
 * `useCanvasSelection`.
 */
export function useContainmentDragDraft(
  flowNodes: HarnessFlowNode[],
  setHarness: Dispatch<SetStateAction<Harness>>,
): {
  nodes: HarnessFlowNode[];
  onNodeDragStart: OnNodeDrag<HarnessFlowNode>;
  onNodesChange: (changes: NodeChange<HarnessFlowNode>[]) => void;
  onNodeDragStop: OnNodeDrag<HarnessFlowNode>;
} {
  const [dragNodes, setDragNodes] = useState<HarnessFlowNode[] | null>(null);

  const nodes = dragNodes ?? flowNodes;

  const onNodeDragStart = useCallback<OnNodeDrag<HarnessFlowNode>>(() => {
    setDragNodes(flowNodes);
  }, [flowNodes]);

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
      const geometry = dragNodes ?? flowNodes;
      const parentId = resolveContainmentParent(node.id, geometry);
      setHarness((current) => reparentNode(current, node.id, parentId));
      setDragNodes(null);
    },
    [dragNodes, flowNodes, setHarness],
  );

  return { nodes, onNodeDragStart, onNodesChange, onNodeDragStop };
}
