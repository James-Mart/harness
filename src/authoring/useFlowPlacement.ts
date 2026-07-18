import {
  useCallback,
  useRef,
  type Dispatch,
  type DragEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import type { Edge, ReactFlowInstance } from "@xyflow/react";

import { readCatalogDragType } from "@/authoring/catalogDrag";
import type { HarnessFlowNode } from "@/components/canvas/flowTypes";
import {
  addCatalogNode,
  type CatalogType,
  type Harness,
  type NodePosition,
} from "@/model";

/**
 * Viewport / drop placement for palette authoring. Captures the React Flow
 * instance via `onInit` (ref, not `useReactFlow`) to avoid store subscription
 * loops with controlled selection.
 */
export function useFlowPlacement(
  setHarness: Dispatch<SetStateAction<Harness>>,
): {
  canvasRef: RefObject<HTMLElement | null>;
  onFlowInit: (instance: ReactFlowInstance<HarnessFlowNode, Edge>) => void;
  onAddCatalogNode: (type: CatalogType) => void;
  onCanvasDragOver: (event: DragEvent) => void;
  onCanvasDrop: (event: DragEvent) => void;
} {
  const canvasRef = useRef<HTMLElement>(null);
  const flowInstanceRef = useRef<ReactFlowInstance<
    HarnessFlowNode,
    Edge
  > | null>(null);

  const onFlowInit = useCallback(
    (instance: ReactFlowInstance<HarnessFlowNode, Edge>) => {
      flowInstanceRef.current = instance;
    },
    [],
  );

  const flowPositionFrom = useCallback(
    (clientX: number, clientY: number): NodePosition | undefined => {
      const instance = flowInstanceRef.current;
      if (!instance) return undefined;
      const position = instance.screenToFlowPosition({
        x: clientX,
        y: clientY,
      });
      return Number.isFinite(position.x) && Number.isFinite(position.y)
        ? position
        : undefined;
    },
    [],
  );

  const viewportCenterPosition = useCallback((): NodePosition | undefined => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return undefined;
    return flowPositionFrom(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
  }, [flowPositionFrom]);

  const addAtPosition = useCallback(
    (type: CatalogType, position: NodePosition | undefined) => {
      setHarness((current) =>
        addCatalogNode(current, type, position ? { position } : {}),
      );
    },
    [setHarness],
  );

  const onAddCatalogNode = useCallback(
    (type: CatalogType) => {
      addAtPosition(type, viewportCenterPosition());
    },
    [addAtPosition, viewportCenterPosition],
  );

  const onCanvasDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onCanvasDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = readCatalogDragType(event.dataTransfer);
      if (!type) return;
      addAtPosition(type, flowPositionFrom(event.clientX, event.clientY));
    },
    [addAtPosition, flowPositionFrom],
  );

  return {
    canvasRef,
    onFlowInit,
    onAddCatalogNode,
    onCanvasDragOver,
    onCanvasDrop,
  };
}
