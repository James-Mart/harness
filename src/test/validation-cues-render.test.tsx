import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import {
  FLOW_LAYOUT,
  leafHeightForPortCount,
  leafTitleHeaderHeight,
} from "@/components/canvas/layoutTokens";
import { EditorLayout } from "@/components/layout/EditorLayout";
import {
  createBaseSeedHarness,
  createWiringCueDemoHarness,
} from "@/model";

describe("wiring advisory cue mapping + render", () => {
  afterEach(() => {
    cleanup();
  });

  it("maps wiring cues onto offending nodes only", () => {
    const demo = createWiringCueDemoHarness();
    const demoNodes = harnessToFlowNodes(demo);
    const unwired = demoNodes.find((node) => node.id === "unwired");
    const multiWire = demoNodes.find((node) => node.id === "multiWire");
    const sourceA = demoNodes.find((node) => node.id === "sourceA");

    expect(unwired?.type).toBe("leaf");
    if (unwired?.type !== "leaf") throw new Error("expected leaf");
    expect(unwired.data.advisoryCues).toEqual(["unwired-required"]);

    expect(multiWire?.type).toBe("container");
    if (multiWire?.type !== "container") throw new Error("expected container");
    expect(multiWire.data.advisoryCues).toEqual(["multi-wire-input"]);

    expect(sourceA?.type).toBe("leaf");
    if (sourceA?.type !== "leaf") throw new Error("expected leaf");
    expect(sourceA.data.advisoryCues).toEqual([]);

    const seed = createBaseSeedHarness();
    for (const node of harnessToFlowNodes(seed)) {
      if (node.type === "leaf" || node.type === "container") {
        expect(node.data.advisoryCues).toEqual([]);
      }
    }
  });

  it("grows leaf layout by cue row height when cues are present", () => {
    const cueHeader = leafTitleHeaderHeight({ hasAdvisoryCues: true });
    const baseHeader = leafTitleHeaderHeight();
    expect(cueHeader - baseHeader).toBe(FLOW_LAYOUT.advisoryCueRowHeight);

    const withCue = leafHeightForPortCount(1, 1, { hasAdvisoryCues: true });
    const without = leafHeightForPortCount(1, 1);
    expect(withCue - without).toBe(FLOW_LAYOUT.advisoryCueRowHeight);

    const demoNodes = harnessToFlowNodes(createWiringCueDemoHarness());
    const seedNodes = harnessToFlowNodes(createBaseSeedHarness());
    const unwired = demoNodes.find((node) => node.id === "unwired");
    const worker = seedNodes.find((node) => node.id === "worker");

    expect(unwired?.type).toBe("leaf");
    expect(worker?.type).toBe("leaf");
    if (unwired?.type !== "leaf" || worker?.type !== "leaf") {
      throw new Error("expected leaves");
    }

    expect(Number(unwired.style?.height) - Number(worker.style?.height)).toBe(
      FLOW_LAYOUT.advisoryCueRowHeight,
    );
  });

  it("renders wiring cues on offending nodes", () => {
    render(<EditorLayout initialHarness={createWiringCueDemoHarness()} />);

    const canvas = screen.getByTestId("editor-canvas");
    const unwired = within(canvas).getByTestId("flow-node-unwired");
    const multiWire = within(canvas).getByTestId("flow-node-multiWire");
    const cuesUnwired = within(unwired).getByTestId("advisory-cues");
    const cuesMulti = within(multiWire).getByTestId("advisory-cues");

    expect(within(cuesUnwired).getByTestId("cue-unwired-required")).toHaveTextContent(
      "needs wire",
    );
    expect(within(cuesUnwired).queryByTestId("cue-multi-wire-input")).toBeNull();

    expect(within(cuesMulti).getByTestId("cue-multi-wire-input")).toHaveTextContent(
      "multi wire",
    );
    expect(within(cuesMulti).queryByTestId("cue-unwired-required")).toBeNull();
  });
});
