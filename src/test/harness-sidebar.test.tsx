import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "@/App";
import { UNTITLED_HARNESS_TITLE } from "@/app/harnessWorkspace";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import { bodyHelperNodeId } from "@/components/canvas/harnessToFlow";
import { EUNOMIO_HARNESS_ID, TRACKER_HARNESS_ID } from "@/model";

describe("harness sidebar", () => {
  afterEach(() => {
    cleanup();
  });

  it("lists seeds with tracker selected by default", () => {
    render(<App />);

    const list = screen.getByTestId("harness-list");
    expect(list).toBeInTheDocument();
    expect(within(list).getAllByRole("button")).toHaveLength(2);
    expect(
      screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByTestId(`harness-item-${EUNOMIO_HARNESS_ID}`),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Tracker harness")).toBeInTheDocument();
    expect(screen.getByText("Eunomio harness")).toBeInTheDocument();
  });

  it("switches the canvas when selecting another harness", () => {
    render(<App />);

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

    fireEvent.click(screen.getByTestId(`harness-item-${EUNOMIO_HARNESS_ID}`));

    expect(
      screen.getByTestId(`harness-item-${EUNOMIO_HARNESS_ID}`),
    ).toHaveAttribute("aria-pressed", "true");
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

  it("adds a blank harness and selects it", () => {
    render(<App />);

    const list = screen.getByTestId("harness-list");
    expect(within(list).getAllByRole("button")).toHaveLength(2);

    fireEvent.click(screen.getByTestId("harness-add"));

    const items = within(list).getAllByRole("button");
    expect(items).toHaveLength(3);
    const added = items[items.length - 1]!;
    expect(added).toHaveTextContent(UNTITLED_HARNESS_TITLE);
    expect(added).toHaveAttribute("aria-pressed", "true");

    const canvas = screen.getByTestId("editor-canvas");
    expect(within(canvas).queryByTestId("flow-node-epic")).toBeNull();
    expect(within(canvas).queryByTestId("flow-node-partition")).toBeNull();
  });
});
