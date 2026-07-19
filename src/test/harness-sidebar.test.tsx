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

function harnessItems() {
  return screen.getAllByTestId(/^harness-item-/);
}

describe("harness sidebar", () => {
  afterEach(() => {
    cleanup();
  });

  it("lists seeds with tracker selected by default", () => {
    render(<App />);

    const list = screen.getByTestId("harness-list");
    expect(list).toBeInTheDocument();
    expect(harnessItems()).toHaveLength(2);
    expect(
      screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByTestId(`harness-item-${EUNOMIO_HARNESS_ID}`),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    ).toHaveTextContent("Tracker harness");
    expect(
      screen.getByTestId(`harness-item-${EUNOMIO_HARNESS_ID}`),
    ).toHaveTextContent("Eunomio harness");
    expect(screen.getByTestId("harness-title")).toHaveTextContent(
      "Tracker harness",
    );
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

    expect(harnessItems()).toHaveLength(2);

    fireEvent.click(screen.getByTestId("harness-add"));

    const items = harnessItems();
    expect(items).toHaveLength(3);
    const added = items[items.length - 1]!;
    expect(added).toHaveTextContent(UNTITLED_HARNESS_TITLE);
    expect(added).toHaveAttribute("aria-pressed", "true");

    const canvas = screen.getByTestId("editor-canvas");
    expect(within(canvas).queryByTestId("flow-node-epic")).toBeNull();
    expect(within(canvas).queryByTestId("flow-node-partition")).toBeNull();
  });

  it("renames a harness via Enter and updates the title", () => {
    render(<App />);

    fireEvent.doubleClick(
      screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    );
    const input = screen.getByTestId(`harness-rename-${TRACKER_HARNESS_ID}`);
    fireEvent.change(input, { target: { value: "My Tracker" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(
      screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    ).toHaveTextContent("My Tracker");
    expect(screen.getByTestId("harness-title")).toHaveTextContent("My Tracker");
  });

  it("renames a harness via blur commit", () => {
    render(<App />);

    fireEvent.doubleClick(
      screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    );
    const input = screen.getByTestId(`harness-rename-${TRACKER_HARNESS_ID}`);
    fireEvent.change(input, { target: { value: "Blurred Tracker" } });
    fireEvent.blur(input);

    expect(
      screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    ).toHaveTextContent("Blurred Tracker");
    expect(screen.getByTestId("harness-title")).toHaveTextContent(
      "Blurred Tracker",
    );
  });

  it("cancels rename on Escape without changing the title", () => {
    render(<App />);

    fireEvent.doubleClick(
      screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    );
    const input = screen.getByTestId(`harness-rename-${TRACKER_HARNESS_ID}`);
    fireEvent.change(input, { target: { value: "Should Not Stick" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);

    expect(
      screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    ).toHaveTextContent("Tracker harness");
    expect(screen.getByTestId("harness-title")).toHaveTextContent(
      "Tracker harness",
    );
  });

  it("deletes the active harness and selects an adjacent one", () => {
    render(<App />);

    fireEvent.click(
      screen.getByTestId(`harness-delete-${TRACKER_HARNESS_ID}`),
    );

    expect(
      screen.queryByTestId(`harness-item-${TRACKER_HARNESS_ID}`),
    ).toBeNull();
    expect(harnessItems()).toHaveLength(1);
    expect(
      screen.getByTestId(`harness-item-${EUNOMIO_HARNESS_ID}`),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("harness-title")).toHaveTextContent(
      "Eunomio harness",
    );
    expect(
      within(screen.getByTestId("editor-canvas")).getByTestId(
        "flow-node-partition",
      ),
    ).toBeInTheDocument();
  });

  it("shows an empty state after deleting the last harness", () => {
    render(<App />);

    fireEvent.click(
      screen.getByTestId(`harness-delete-${TRACKER_HARNESS_ID}`),
    );
    fireEvent.click(
      screen.getByTestId(`harness-delete-${EUNOMIO_HARNESS_ID}`),
    );

    expect(screen.queryByTestId("harness-list")).toBeNull();
    expect(screen.getByTestId("harness-list-empty")).toBeInTheDocument();
    expect(screen.getByTestId("harness-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("editor-canvas")).toBeNull();
    expect(screen.getByTestId("harness-title")).toHaveTextContent("Harness");
  });
});
