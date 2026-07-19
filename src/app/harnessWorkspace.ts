import {
  createHarnessForSeed,
  harnessIdForSeed,
  type HarnessBootstrap,
} from "@/app/harnessBootstrap";
import { EMPTY_RUN_CONFIG, type Harness } from "@/model";

export const UNTITLED_HARNESS_TITLE = "Untitled harness";

export type HarnessWorkspaceState = {
  harnesses: Harness[];
  selectedId: string | null;
};

/** Empty graph for a newly added workspace entry. */
export function createBlankHarness(id: string): Harness {
  return {
    id,
    title: UNTITLED_HARNESS_TITLE,
    boundary: [],
    nodes: [],
    edges: [],
    runConfig: structuredClone(EMPTY_RUN_CONFIG),
  };
}

function allocateHarnessId(harnesses: readonly Harness[]): string {
  const ids = new Set(harnesses.map((harness) => harness.id));
  let n = 1;
  while (ids.has(`harness-${n}`)) n += 1;
  return `harness-${n}`;
}

/** Seed Tracker + Eunomio, or a single demo harness from bootstrap. */
export function createWorkspaceState(
  bootstrap: HarnessBootstrap,
): HarnessWorkspaceState {
  if (bootstrap.demoHarness !== undefined) {
    return {
      harnesses: [bootstrap.demoHarness],
      selectedId: bootstrap.demoHarness.id,
    };
  }

  const tracker = createHarnessForSeed("tracker");
  const eunomio = createHarnessForSeed("eunomio");
  return {
    harnesses: [tracker, eunomio],
    selectedId: harnessIdForSeed(bootstrap.seedKey),
  };
}

export function selectedHarness(
  state: HarnessWorkspaceState,
): Harness | null {
  if (state.selectedId === null) return null;
  return (
    state.harnesses.find((harness) => harness.id === state.selectedId) ?? null
  );
}

export function selectHarness(
  state: HarnessWorkspaceState,
  id: string,
): HarnessWorkspaceState {
  if (!state.harnesses.some((harness) => harness.id === id)) return state;
  if (state.selectedId === id) return state;
  return { ...state, selectedId: id };
}

export function addHarness(state: HarnessWorkspaceState): HarnessWorkspaceState {
  const id = allocateHarnessId(state.harnesses);
  const harness = createBlankHarness(id);
  return {
    harnesses: [...state.harnesses, harness],
    selectedId: id,
  };
}

export function renameHarness(
  state: HarnessWorkspaceState,
  id: string,
  title: string,
): HarnessWorkspaceState {
  const index = state.harnesses.findIndex((harness) => harness.id === id);
  if (index === -1) return state;
  const current = state.harnesses[index]!;
  if (current.title === title) return state;
  const harnesses = state.harnesses.slice();
  harnesses[index] = { ...current, title };
  return { ...state, harnesses };
}

/**
 * Remove a harness. If it was selected, select an adjacent neighbor;
 * if it was the last entry, `selectedId` becomes null.
 */
export function deleteHarness(
  state: HarnessWorkspaceState,
  id: string,
): HarnessWorkspaceState {
  const index = state.harnesses.findIndex((harness) => harness.id === id);
  if (index === -1) return state;
  const harnesses = state.harnesses.filter((harness) => harness.id !== id);
  if (state.selectedId !== id) {
    return { ...state, harnesses };
  }
  if (harnesses.length === 0) {
    return { harnesses, selectedId: null };
  }
  const nextIndex = Math.min(index, harnesses.length - 1);
  return { harnesses, selectedId: harnesses[nextIndex]!.id };
}

/** Persist canvas edits for a harness already in the workspace. */
export function updateHarness(
  state: HarnessWorkspaceState,
  harness: Harness,
): HarnessWorkspaceState {
  const index = state.harnesses.findIndex((entry) => entry.id === harness.id);
  if (index === -1) return state;
  if (state.harnesses[index] === harness) return state;
  const harnesses = state.harnesses.slice();
  harnesses[index] = harness;
  return { ...state, harnesses };
}

export type HarnessWorkspaceAction =
  | { type: "select"; id: string }
  | { type: "add" }
  | { type: "rename"; id: string; title: string }
  | { type: "delete"; id: string }
  | { type: "update"; harness: Harness };

export function harnessWorkspaceReducer(
  state: HarnessWorkspaceState,
  action: HarnessWorkspaceAction,
): HarnessWorkspaceState {
  switch (action.type) {
    case "select":
      return selectHarness(state, action.id);
    case "add":
      return addHarness(state);
    case "rename":
      return renameHarness(state, action.id, action.title);
    case "delete":
      return deleteHarness(state, action.id);
    case "update":
      return updateHarness(state, action.harness);
  }
}
