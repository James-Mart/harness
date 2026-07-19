import { useMemo, useReducer } from "react";

import type { HarnessBootstrap } from "@/app/harnessBootstrap";
import {
  createWorkspaceState,
  harnessWorkspaceReducer,
  selectedHarness,
} from "@/app/harnessWorkspace";
import type { Harness } from "@/model";

export type HarnessWorkspace = {
  harnesses: Harness[];
  selectedId: string | null;
  selectedHarness: Harness | null;
  selectHarness: (id: string) => void;
  addHarness: () => void;
  renameHarness: (id: string, title: string) => void;
  deleteHarness: (id: string) => void;
  /** Apply canvas edits into the in-memory workspace (controlled EditorLayout). */
  updateHarness: (harness: Harness) => void;
};

/** In-memory multi-harness workspace keyed by harness id (session-scoped). */
export function useHarnessWorkspace(
  bootstrap: HarnessBootstrap,
): HarnessWorkspace {
  const [state, dispatch] = useReducer(
    harnessWorkspaceReducer,
    bootstrap,
    createWorkspaceState,
  );

  const actions = useMemo(
    () => ({
      selectHarness: (id: string) => dispatch({ type: "select", id }),
      addHarness: () => dispatch({ type: "add" }),
      renameHarness: (id: string, title: string) =>
        dispatch({ type: "rename", id, title }),
      deleteHarness: (id: string) => dispatch({ type: "delete", id }),
      updateHarness: (harness: Harness) =>
        dispatch({ type: "update", harness }),
    }),
    [],
  );

  return {
    harnesses: state.harnesses,
    selectedId: state.selectedId,
    selectedHarness: selectedHarness(state),
    ...actions,
  };
}
