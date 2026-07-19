import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "@/App";
import { EUNOMIO_HARNESS_ID, TRACKER_HARNESS_ID } from "@/model";

describe("multi-harness workspace UI", () => {
  afterEach(() => {
    cleanup();
  });

  it("preserves edits when switching harnesses and back", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("flow-node-epic"));
    const title = screen.getByTestId("inspector-field-title");
    fireEvent.change(title, { target: { value: "Edited Epic" } });
    expect(title).toHaveValue("Edited Epic");

    fireEvent.click(screen.getByTestId(`harness-item-${EUNOMIO_HARNESS_ID}`));
    expect(
      within(screen.getByTestId("editor-canvas")).getByTestId(
        "flow-node-partition",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`harness-item-${TRACKER_HARNESS_ID}`));
    fireEvent.click(screen.getByTestId("flow-node-epic"));
    expect(screen.getByTestId("inspector-field-title")).toHaveValue(
      "Edited Epic",
    );
  });
});
