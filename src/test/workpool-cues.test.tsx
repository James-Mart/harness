import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import {
  FLOW_LAYOUT,
  containerChromeHeaderHeight,
} from "@/components/canvas/layoutTokens";
import { EditorLayout } from "@/components/layout/EditorLayout";
import {
  createWorkPoolCueDemoHarness,
  createWorkPoolSeedHarness,
} from "@/model";

describe("work-pool advisory cue mapping + render", () => {
  afterEach(() => {
    cleanup();
  });

  it("maps advisory cues onto offending containers only", () => {
    const demo = createWorkPoolCueDemoHarness();
    const demoNodes = harnessToFlowNodes(demo);
    const noAppender = demoNodes.find((node) => node.id === "noAppender");
    const noFixpoint = demoNodes.find((node) => node.id === "noFixpoint");

    expect(noAppender?.type).toBe("container");
    if (noAppender?.type !== "container") throw new Error("expected container");
    expect(noAppender.data.advisoryCues).toEqual(["missing-appender"]);

    expect(noFixpoint?.type).toBe("container");
    if (noFixpoint?.type !== "container") throw new Error("expected container");
    expect(noFixpoint.data.advisoryCues).toEqual(["missing-fixpoint"]);

    const seed = createWorkPoolSeedHarness();
    const pool = harnessToFlowNodes(seed).find((node) => node.id === "pool");
    expect(pool?.type).toBe("container");
    if (pool?.type !== "container") throw new Error("expected container");
    expect(pool.data.advisoryCues).toEqual([]);
  });

  it("grows container layout by cue row height when cues are present", () => {
    const cueHeader = containerChromeHeaderHeight({ hasAdvisoryCues: true });
    const baseHeader = containerChromeHeaderHeight();
    expect(cueHeader - baseHeader).toBe(FLOW_LAYOUT.containerCueRowHeight);

    const demoNodes = harnessToFlowNodes(createWorkPoolCueDemoHarness());
    const seedNodes = harnessToFlowNodes(createWorkPoolSeedHarness());
    const noFixpoint = demoNodes.find((node) => node.id === "noFixpoint");
    const pool = seedNodes.find((node) => node.id === "pool");
    const fanOut = demoNodes.find((node) => node.id === "fanOut");

    expect(noFixpoint?.type).toBe("container");
    expect(pool?.type).toBe("container");
    if (noFixpoint?.type !== "container" || pool?.type !== "container") {
      throw new Error("expected containers");
    }

    // Same single fan-out child shape: cue chrome is the only height delta.
    expect(Number(noFixpoint.style?.height) - Number(pool.style?.height)).toBe(
      FLOW_LAYOUT.containerCueRowHeight,
    );
    expect(fanOut?.position.y).toBe(cueHeader + FLOW_LAYOUT.containerPadY);
  });

  it("renders advisory cues on offending containers", () => {
    render(<EditorLayout initialHarness={createWorkPoolCueDemoHarness()} />);

    const canvas = screen.getByTestId("editor-canvas");
    const noAppender = within(canvas).getByTestId("flow-node-noAppender");
    const noFixpoint = within(canvas).getByTestId("flow-node-noFixpoint");
    const cuesNoAppender = within(noAppender).getByTestId("advisory-cues");
    const cuesNoFixpoint = within(noFixpoint).getByTestId("advisory-cues");

    expect(
      within(cuesNoAppender).getByTestId("cue-missing-appender"),
    ).toHaveTextContent("no append");
    expect(
      within(cuesNoAppender).queryByTestId("cue-missing-fixpoint"),
    ).toBeNull();

    expect(
      within(cuesNoFixpoint).getByTestId("cue-missing-fixpoint"),
    ).toHaveTextContent("no fixpoint");
    expect(
      within(cuesNoFixpoint).queryByTestId("cue-missing-appender"),
    ).toBeNull();
  });
});
