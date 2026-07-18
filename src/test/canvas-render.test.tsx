import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { CURRENT_ITEM_PORT_ID } from "@/model";

describe("canvas render", () => {
  it("renders seeded leaf and container nodes with typed ports", () => {
    render(<App />);

    const canvas = screen.getByTestId("editor-canvas");
    const source = within(canvas).getByTestId("flow-node-source");
    const loop = within(canvas).getByTestId("flow-node-loop");
    const worker = within(canvas).getByTestId("flow-node-worker");

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
    expect(
      canvas.querySelector('.react-flow__node[data-id="worker"]'),
    ).toBeTruthy();
    expect(
      canvas.querySelector('.react-flow__node[data-id="loop"]'),
    ).toBeTruthy();
  });
});
