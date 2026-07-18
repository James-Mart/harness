import {
  useCallback,
  useRef,
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
import { reparentNode, setNodePosition, type Harness } from "@/model";

/**
 * Ephemeral React Flow positions during a node drag, committed to harness
 * containment + top-level placement on drag-stop. Selection stamping is owned
 * by `useCanvasSelection`.
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
  // Synchronous gate so idle RF change batches skip setState entirely
  // (updater bailout alone still schedules the updater).
  const dragActiveRef = useRef(false);

  const nodes = dragNodes ?? flowNodes;

  const onNodeDragStart = useCallback<OnNodeDrag<HarnessFlowNode>>(() => {
    dragActiveRef.current = true;
    setDragNodes(flowNodes);
  }, [flowNodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<HarnessFlowNode>[]) => {
      if (!dragActiveRef.current) return;
      setDragNodes((current) => {
        if (current === null) return current;
        // Full RF change stream while dragging — position moves and
        // dimension/measured updates must both land so controlled nodes
        // keep size and are not re-initialized (white-flash) each frame.
        return applyNodeChanges(changes, current);
      });
    },
    [],
  );

  const onNodeDragStop = useCallback<OnNodeDrag<HarnessFlowNode>>(
    (_event, node) => {
      // Controlled positions live in dragNodes — not RF's callback node list.
      const geometry = dragNodes ?? flowNodes;
      const parentId = resolveContainmentParent(node.id, geometry);
      const dragged = geometry.find((entry) => entry.id === node.id);
      setHarness((current) => {
        let next = reparentNode(current, node.id, parentId);
        // Top-level nodes persist flow-space placement so they do not snap
        // back to auto-layout / a stale create-time position after drag.
        if (parentId === undefined && dragged) {
          next = setNodePosition(next, node.id, dragged.position);
        }
        return next;
      });
      dragActiveRef.current = false;
      setDragNodes(null);
    },
    [dragNodes, flowNodes, setHarness],
  );

  return { nodes, onNodeDragStart, onNodesChange, onNodeDragStop };
}
