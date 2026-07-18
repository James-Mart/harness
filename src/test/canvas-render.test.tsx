import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "@/App";

describe("canvas render", () => {
  it("renders seeded leaf and container nodes with $currentItem", () => {
    render(<App />);

    const canvas = screen.getByTestId("editor-canvas");
    const source = within(canvas).getByTestId("flow-node-source");
    const loop = within(canvas).getByTestId("flow-node-loop");
    const worker = within(canvas).getByTestId("flow-node-worker");

    expect(source).toHaveAttribute("data-kind", "leaf");
    expect(within(source).getByText("List source")).toBeInTheDocument();

    expect(loop).toHaveAttribute("data-kind", "container");
    expect(within(loop).getByText("For each")).toBeInTheDocument();
    expect(within(loop).getByTestId("current-item-port")).toHaveTextContent(
      "$currentItem",
    );
    expect(within(loop).getByTestId("container-body")).toBeInTheDocument();

    expect(worker).toHaveAttribute("data-kind", "leaf");
    expect(within(worker).getByText("Implementor")).toBeInTheDocument();
    expect(
      canvas.querySelector('.react-flow__node[data-id="worker"]'),
    ).toBeTruthy();
    expect(
      canvas.querySelector('.react-flow__node[data-id="loop"]'),
    ).toBeTruthy();
  });
});
