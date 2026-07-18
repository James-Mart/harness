import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "@/App";

describe("editor layout", () => {
  it("renders palette, canvas, and inspector panes", () => {
    const { container } = render(<App />);

    expect(screen.getByTestId("editor-layout")).toBeInTheDocument();
    expect(screen.getByTestId("node-palette")).toBeInTheDocument();
    expect(screen.getByTestId("editor-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("node-inspector")).toBeInTheDocument();
    expect(container.querySelector(".react-flow")).toBeTruthy();
    expect(
      screen.getByText(
        "Select a node to edit its widgets and see its typed signature.",
      ),
    ).toBeInTheDocument();
  });
});
