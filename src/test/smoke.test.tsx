import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("renders with Vitest and Testing Library", () => {
    render(<p>Harness</p>);
    expect(screen.getByText("Harness")).toBeInTheDocument();
  });
});
