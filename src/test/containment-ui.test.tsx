import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import { EditorLayout } from "@/components/layout/EditorLayout";
import { createBaseSeedHarness, reparentNode } from "@/model";

describe("containment render smoke", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a reparented leaf on the canvas", () => {
    const nested = reparentNode(createBaseSeedHarness(), "source", "loop");
    render(<EditorLayout initialHarness={nested} />);

    const canvas = screen.getByTestId("editor-canvas");
    expect(within(canvas).getByTestId("flow-node-source")).toBeInTheDocument();
    expect(within(canvas).getByTestId("flow-node-loop")).toBeInTheDocument();
    expect(
      harnessToFlowNodes(nested).find((n) => n.id === "source")?.parentId,
    ).toBe("loop");
  });

  it("renders an un-nested leaf on the canvas", () => {
    const unnested = reparentNode(createBaseSeedHarness(), "worker", undefined);
    render(<EditorLayout initialHarness={unnested} />);

    const canvas = screen.getByTestId("editor-canvas");
    expect(within(canvas).getByTestId("flow-node-worker")).toBeInTheDocument();
    expect(
      harnessToFlowNodes(unnested).find((n) => n.id === "worker")?.parentId,
    ).toBeUndefined();
    expect(
      unnested.nodes.find((node) => node.id === "worker")?.parentId,
    ).toBeUndefined();
  });

  it("renders the base seed with worker under foreach", () => {
    render(<EditorLayout initialHarness={createBaseSeedHarness()} />);

    const canvas = screen.getByTestId("editor-canvas");
    expect(within(canvas).getByTestId("flow-node-worker")).toBeInTheDocument();
    expect(within(canvas).getByTestId("flow-node-loop")).toBeInTheDocument();
    expect(
      harnessToFlowNodes(createBaseSeedHarness()).find((n) => n.id === "worker")
        ?.parentId,
    ).toBe("loop");
  });
});
