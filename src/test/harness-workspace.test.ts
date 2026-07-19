import { describe, expect, it } from "vitest";

import type { HarnessBootstrap } from "@/app/harnessBootstrap";
import {
  addHarness,
  createBlankHarness,
  createWorkspaceState,
  deleteHarness,
  renameHarness,
  selectHarness,
  selectedHarness,
  UNTITLED_HARNESS_TITLE,
  updateHarness,
} from "@/app/harnessWorkspace";
import {
  createBaseSeedHarness,
  EUNOMIO_HARNESS_ID,
  TRACKER_HARNESS_ID,
  updateNode,
} from "@/model";

const seededBootstrap: HarnessBootstrap = { seedKey: "tracker" };

describe("harnessWorkspace", () => {
  it("seeds Tracker and Eunomio with Tracker selected by default", () => {
    const state = createWorkspaceState(seededBootstrap);
    expect(state.harnesses.map((h) => h.id)).toEqual([
      TRACKER_HARNESS_ID,
      EUNOMIO_HARNESS_ID,
    ]);
    expect(state.selectedId).toBe(TRACKER_HARNESS_ID);
  });

  it("honors bootstrap seedKey eunomio", () => {
    const state = createWorkspaceState({ seedKey: "eunomio" });
    expect(state.selectedId).toBe(EUNOMIO_HARNESS_ID);
  });

  it("seeds a single demo harness when present", () => {
    const demo = createBaseSeedHarness();
    const state = createWorkspaceState({
      seedKey: "tracker",
      demoHarness: demo,
    });
    expect(state.harnesses).toEqual([demo]);
    expect(state.selectedId).toBe(demo.id);
  });

  it("selectHarness switches the selected id", () => {
    const state = selectHarness(
      createWorkspaceState(seededBootstrap),
      EUNOMIO_HARNESS_ID,
    );
    expect(state.selectedId).toBe(EUNOMIO_HARNESS_ID);
  });

  it("addHarness appends an untitled blank harness and selects it", () => {
    const state = addHarness(createWorkspaceState(seededBootstrap));
    expect(state.harnesses).toHaveLength(3);
    const added = selectedHarness(state);
    expect(added).toMatchObject({
      id: "harness-1",
      title: UNTITLED_HARNESS_TITLE,
      nodes: [],
      edges: [],
      boundary: [],
    });
    expect(state.selectedId).toBe("harness-1");
  });

  it("renameHarness updates the title", () => {
    const state = renameHarness(
      createWorkspaceState(seededBootstrap),
      TRACKER_HARNESS_ID,
      "My Tracker",
    );
    expect(selectedHarness(state)?.title).toBe("My Tracker");
  });

  it("deleteHarness removes and selects an adjacent harness", () => {
    let state = createWorkspaceState(seededBootstrap);
    state = deleteHarness(state, TRACKER_HARNESS_ID);
    expect(state.harnesses.map((h) => h.id)).toEqual([EUNOMIO_HARNESS_ID]);
    expect(state.selectedId).toBe(EUNOMIO_HARNESS_ID);
  });

  it("deleteHarness on the last entry clears selection", () => {
    let state = createWorkspaceState(seededBootstrap);
    state = deleteHarness(state, TRACKER_HARNESS_ID);
    state = deleteHarness(state, EUNOMIO_HARNESS_ID);
    expect(state.harnesses).toEqual([]);
    expect(state.selectedId).toBeNull();
  });

  it("updateHarness preserves edits across select round-trips", () => {
    let state = createWorkspaceState(seededBootstrap);
    const tracker = selectedHarness(state)!;
    const edited = updateNode(tracker, "epic", {
      field: "title",
      value: "Edited Epic",
    });
    state = updateHarness(state, edited);
    state = selectHarness(state, EUNOMIO_HARNESS_ID);
    state = selectHarness(state, TRACKER_HARNESS_ID);
    const restored = selectedHarness(state)!;
    expect(restored.nodes.find((n) => n.id === "epic")?.title).toBe(
      "Edited Epic",
    );
  });

  it("createBlankHarness uses the untitled title", () => {
    expect(createBlankHarness("harness-9").title).toBe(UNTITLED_HARNESS_TITLE);
  });
});
