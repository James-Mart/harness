import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "@/App";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import { EditorLayout } from "@/components/layout/EditorLayout";
import { CURRENT_ITEM_PORT_ID, createBranchingSeedHarness } from "@/model";

describe("canvas render", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders seeded leaf and container nodes with typed ports", () => {
    render(<App />);

    const canvas = screen.getByTestId("editor-canvas");
    const harness = within(canvas).getByTestId(
      `flow-node-${HARNESS_FLOW_NODE_ID}`,
    );
    const source = within(canvas).getByTestId("flow-node-source");
    const loop = within(canvas).getByTestId("flow-node-loop");
    const worker = within(canvas).getByTestId("flow-node-worker");

    expect(harness).toHaveAttribute("data-kind", "harness");
    expect(within(harness).getByText("Base seed harness")).toBeInTheDocument();
    expect(within(harness).getByTestId("port-tasks")).toHaveAttribute(
      "data-port-direction",
      "in",
    );
    expect(within(harness).getByTestId("port-summary")).toHaveAttribute(
      "data-port-direction",
      "out",
    );
    expect(within(harness).getByTestId("harness-body")).toBeInTheDocument();

    expect(source).toHaveAttribute("data-kind", "leaf");
    expect(within(source).getByText("List source")).toBeInTheDocument();
    expect(within(source).getByTestId("port-items")).toBeInTheDocument();
    expect(within(source).getByTestId("port-items")).toHaveAttribute(
      "data-port-direction",
      "out",
    );
    expect(within(source).getByTestId("port-label-items")).toHaveTextContent(
      "items",
    );

    expect(loop).toHaveAttribute("data-kind", "container");
    expect(within(loop).getByText("For each")).toBeInTheDocument();
    expect(within(loop).getByTestId("port-items")).toHaveAttribute(
      "data-iterable",
      "true",
    );
    expect(within(loop).getByTestId("port-items")).toHaveAttribute(
      "data-port-direction",
      "in",
    );
    expect(
      within(loop).getByTestId(`port-${CURRENT_ITEM_PORT_ID}`),
    ).toHaveAttribute("data-port-direction", "out");
    expect(within(loop).getByTestId("container-body")).toBeInTheDocument();

    expect(worker).toHaveAttribute("data-kind", "leaf");
    expect(within(worker).getByText("Implementor")).toBeInTheDocument();
    expect(within(worker).getByTestId("port-task")).toHaveAttribute(
      "data-port-direction",
      "in",
    );
    expect(within(worker).getByTestId("port-result")).toHaveAttribute(
      "data-port-direction",
      "out",
    );
    expect(within(worker).getByTestId("port-exec-in")).toBeInTheDocument();
    expect(within(worker).getByTestId("port-exec-out")).toBeInTheDocument();

    expect(
      canvas.querySelector('.react-flow__node[data-id="worker"]'),
    ).toBeTruthy();
    expect(
      canvas.querySelector('.react-flow__node[data-id="loop"]'),
    ).toBeTruthy();
    expect(
      canvas.querySelector(
        `.react-flow__node[data-id="${HARNESS_FLOW_NODE_ID}"]`,
      ),
    ).toBeTruthy();
  });

  it("renders a branching gate with ok/deny exec outs", () => {
    render(<EditorLayout initialHarness={createBranchingSeedHarness()} />);

    const canvas = screen.getByTestId("editor-canvas");
    const gate = within(canvas).getByTestId("flow-node-gate");
    expect(gate).toHaveAttribute("data-kind", "leaf");
    expect(within(gate).getByText("Gate")).toBeInTheDocument();
    expect(within(gate).getByTestId("port-exec-out-ok")).toHaveAttribute(
      "data-exec-branch",
      "ok",
    );
    expect(within(gate).getByTestId("port-exec-out-deny")).toHaveAttribute(
      "data-exec-branch",
      "deny",
    );
    expect(within(canvas).getByTestId("flow-node-onOk")).toBeInTheDocument();
    expect(within(canvas).getByTestId("flow-node-onDeny")).toBeInTheDocument();
  });
});
