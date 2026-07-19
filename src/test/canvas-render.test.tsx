import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import { bodyHelperNodeId } from "@/components/canvas/harnessToFlow";
import { EditorLayout } from "@/components/layout/EditorLayout";
import {
  CURRENT_ITEM_PORT_ID,
  createBaseSeedHarness,
  createBranchingSeedHarness,
  createWorkPoolSeedHarness,
} from "@/model";

describe("canvas render", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders seeded leaf and container nodes with typed ports", () => {
    render(<EditorLayout initialHarness={createBaseSeedHarness()} />);

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
    // DOM smoke: `$currentItem` lives on Variables, not outer chrome.
    expect(
      within(loop).queryByTestId(`port-${CURRENT_ITEM_PORT_ID}`),
    ).toBeNull();
    expect(
      within(canvas).getByTestId(
        `flow-node-${bodyHelperNodeId("loop", "variables")}`,
      ),
    ).toHaveAttribute("data-helper-kind", "variables");
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

  it("renders work-pool policy, live source, fan-out, and fixpoint markers", () => {
    render(<EditorLayout initialHarness={createWorkPoolSeedHarness()} />);

    const canvas = screen.getByTestId("editor-canvas");
    const pool = within(canvas).getByTestId("flow-node-pool");
    const fanOut = within(canvas).getByTestId("flow-node-fanOut");

    expect(within(pool).getByTestId("source-marker")).toHaveAttribute(
      "data-source-kind",
      "live",
    );
    expect(within(pool).getByTestId("source-marker")).toHaveTextContent("live");
    expect(within(pool).getByTestId("concurrency-badge")).toHaveTextContent(
      "∥ ≤4",
    );
    expect(within(pool).getByTestId("fixpoint-marker")).toHaveTextContent(
      "fixpoint",
    );
    expect(within(pool).getByTestId("fan-out-target-marker")).toHaveTextContent(
      "fan-out",
    );
    expect(within(pool).queryByTestId("advisory-cues")).toBeNull();

    const fanOutMarker = within(fanOut).getByTestId("fan-out-marker");
    expect(fanOutMarker).toHaveAttribute("data-appends-to", "pool");
    expect(fanOutMarker).toHaveTextContent("append → Work pool");
  });

  it("renders snapshot foreach with sequential badge and no fixpoint", () => {
    render(<EditorLayout initialHarness={createBaseSeedHarness()} />);

    const canvas = screen.getByTestId("editor-canvas");
    const loop = within(canvas).getByTestId("flow-node-loop");
    expect(within(loop).getByTestId("source-marker")).toHaveAttribute(
      "data-source-kind",
      "snapshot",
    );
    expect(within(loop).getByTestId("concurrency-badge")).toHaveTextContent(
      "seq",
    );
    expect(within(loop).queryByTestId("fixpoint-marker")).toBeNull();
    expect(within(loop).queryByTestId("fan-out-target-marker")).toBeNull();
  });
});
