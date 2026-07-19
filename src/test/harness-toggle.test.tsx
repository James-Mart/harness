import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "@/App";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import { bodyHelperNodeId } from "@/components/canvas/harnessToFlow";

describe("harness toggle", () => {
  afterEach(() => {
    cleanup();
  });

  it("defaults to the tracker seed and switches the canvas to eunomio", () => {
    render(<App />);

    const toggle = screen.getByTestId("harness-toggle");
    expect(toggle).toBeInTheDocument();
    expect(screen.getByTestId("harness-seed-tracker")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const canvas = screen.getByTestId("editor-canvas");
    expect(
      canvas.querySelector(
        `.react-flow__node[data-id="${HARNESS_FLOW_NODE_ID}"]`,
      ),
    ).toBeNull();
    expect(
      within(canvas).getByTestId(
        `flow-node-${bodyHelperNodeId(HARNESS_FLOW_NODE_ID, "variables")}`,
      ),
    ).toBeInTheDocument();
    expect(within(canvas).getByTestId("flow-node-epic")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("harness-seed-eunomio"));

    expect(screen.getByTestId("harness-seed-eunomio")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const nextCanvas = screen.getByTestId("editor-canvas");
    expect(
      nextCanvas.querySelector(
        `.react-flow__node[data-id="${HARNESS_FLOW_NODE_ID}"]`,
      ),
    ).toBeNull();
    expect(
      within(nextCanvas).getByTestId("flow-node-partition"),
    ).toBeInTheDocument();
    expect(
      within(nextCanvas).getByTestId("flow-node-planner"),
    ).toBeInTheDocument();
    expect(
      within(nextCanvas).getByTestId("flow-node-accept"),
    ).toBeInTheDocument();
  });
});
