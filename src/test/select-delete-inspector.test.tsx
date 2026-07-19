import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NodeInspector } from "@/components/inspector/NodeInspector";
import { EditorLayout } from "@/components/layout/EditorLayout";
import { createBaseSeedHarness, createWorkPoolSeedHarness } from "@/model";

afterEach(() => {
  cleanup();
});

describe("NodeInspector", () => {
  it("renders typed signature and leaf structural params", () => {
    const worker = createBaseSeedHarness().nodes.find(
      (node) => node.id === "worker",
    );
    expect(worker).toBeDefined();
    if (!worker) return;

    render(
      <NodeInspector
        target={{ kind: "node", node: worker }}
        onDeleteNode={() => undefined}
      />,
    );

    expect(screen.getByTestId("inspector-title")).toHaveTextContent(
      "Implementor",
    );
    expect(screen.getByTestId("inspector-port-task")).toHaveTextContent("task");
    expect(screen.getByTestId("inspector-port-result")).toHaveTextContent(
      "result",
    );
    expect(screen.getByTestId("inspector-catalog-type")).toHaveTextContent(
      "implementor",
    );
    expect(screen.getByTestId("inspector-delete")).toBeInTheDocument();
  });

  it("renders editable container structural source/concurrency/end", () => {
    const pool = createWorkPoolSeedHarness().nodes.find(
      (node) => node.id === "pool",
    );
    expect(pool).toBeDefined();
    if (!pool) return;

    render(<NodeInspector target={{ kind: "node", node: pool }} />);

    expect(screen.getByTestId("inspector-field-source")).toHaveValue("live");
    expect(screen.getByTestId("inspector-field-concurrency")).toHaveValue(
      "parallel",
    );
    expect(screen.getByTestId("inspector-field-max-concurrency")).toHaveValue(
      4,
    );
    expect(screen.getByTestId("inspector-field-end")).toBeChecked();
  });
});

describe("select + delete inspector wiring", () => {
  it("shows the selected node's inspector from editor selection", () => {
    render(<EditorLayout initialSelectedNodeIds={["worker"]} />);

    const inspector = screen.getByTestId("node-inspector");
    expect(within(inspector).getByTestId("inspector-title")).toHaveTextContent(
      "Implementor",
    );
    expect(
      within(inspector).getByTestId("inspector-port-task"),
    ).toBeInTheDocument();
  });

  it("deletes the selected node from the inspector button", () => {
    render(<EditorLayout initialSelectedNodeIds={["source"]} />);

    const canvas = screen.getByTestId("editor-canvas");
    expect(within(canvas).getByTestId("flow-node-source")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("inspector-delete"));

    expect(
      within(canvas).queryByTestId("flow-node-source"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Select a node or edge to inspect."),
    ).toBeInTheDocument();
  });

  it("cascades container delete to body children on the canvas", () => {
    render(<EditorLayout initialSelectedNodeIds={["loop"]} />);

    fireEvent.click(screen.getByTestId("inspector-delete"));

    const canvas = screen.getByTestId("editor-canvas");
    expect(
      within(canvas).queryByTestId("flow-node-loop"),
    ).not.toBeInTheDocument();
    expect(
      within(canvas).queryByTestId("flow-node-worker"),
    ).not.toBeInTheDocument();
    expect(within(canvas).getByTestId("flow-node-source")).toBeInTheDocument();
  });

  it("edits a node title from the inspector and reflects it live", () => {
    render(<EditorLayout initialSelectedNodeIds={["worker"]} />);

    const titleField = screen.getByTestId("inspector-field-title");
    expect(titleField).toHaveValue("Implementor");

    fireEvent.change(titleField, { target: { value: "Builder" } });

    const inspector = screen.getByTestId("node-inspector");
    expect(within(inspector).getByTestId("inspector-title")).toHaveTextContent(
      "Builder",
    );
    expect(screen.getByTestId("inspector-field-title")).toHaveValue("Builder");
  });
});

describe("edge inspector wiring", () => {
  const dataEdgeId = "data:source/items->loop/items";

  it("shows a selected edge's endpoints", () => {
    render(<EditorLayout initialSelectedEdgeIds={[dataEdgeId]} />);

    const inspector = screen.getByTestId("node-inspector");
    expect(within(inspector).getByTestId("inspector-edge")).toBeInTheDocument();
    expect(
      within(inspector).getByTestId("inspector-edge-source"),
    ).toHaveTextContent("source");
    expect(
      within(inspector).getByTestId("inspector-edge-target"),
    ).toHaveTextContent("loop");
  });

  it("deletes the selected edge from the inspector button", () => {
    render(<EditorLayout initialSelectedEdgeIds={[dataEdgeId]} />);

    const inspector = screen.getByTestId("node-inspector");
    fireEvent.click(within(inspector).getByTestId("inspector-edge-delete"));

    expect(within(inspector).queryByTestId("inspector-edge")).toBeNull();
    expect(
      screen.getByText("Select a node or edge to inspect."),
    ).toBeInTheDocument();
  });
});
