import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { createWorkPoolSeedHarness, type Harness } from "@/model";

afterEach(() => {
  cleanup();
});

describe("run-config edit surface", () => {
  it("always exposes depth bound in the inspector", () => {
    render(<EditorLayout />);

    const inspector = screen.getByTestId("node-inspector");
    expect(
      within(inspector).getByTestId("inspector-run-config"),
    ).toBeInTheDocument();
    expect(within(inspector).getByTestId("run-config-depth-bound")).toHaveValue(
      null,
    );
  });

  it("edits depth bound and per-container max concurrency via the surface", () => {
    const seed = createWorkPoolSeedHarness();
    const snapshots: Harness[] = [];

    render(
      <EditorLayout
        initialHarness={seed}
        initialSelectedNodeIds={["pool"]}
        onHarnessChange={(harness) => {
          snapshots.push(harness);
        }}
      />,
    );

    const initial = snapshots[0];
    expect(initial).toBeDefined();
    if (!initial) return;

    const depth = screen.getByTestId("run-config-depth-bound");
    fireEvent.change(depth, { target: { value: "7" } });
    expect(depth).toHaveValue(7);

    const afterDepth = snapshots.at(-1)!;
    expect(afterDepth.runConfig.depthBound).toBe(7);
    expect(afterDepth.nodes).toBe(initial.nodes);
    expect(afterDepth.edges).toBe(initial.edges);

    const max = screen.getByTestId("run-config-max-concurrency");
    expect(max).toHaveValue(null);
    fireEvent.change(max, { target: { value: "2" } });
    expect(max).toHaveValue(2);

    const afterMax = snapshots.at(-1)!;
    expect(afterMax.runConfig.perContainer.pool).toEqual({
      maxConcurrency: 2,
    });
    expect(afterMax.nodes).toBe(initial.nodes);
    expect(afterMax.edges).toBe(initial.edges);

    // Structural max stays at the catalog default (4).
    expect(screen.getByTestId("inspector-field-max-concurrency")).toHaveValue(
      4,
    );
  });

  it("hides run-config max concurrency for sequential containers", () => {
    render(<EditorLayout initialSelectedNodeIds={["loop"]} />);

    expect(screen.getByTestId("run-config-depth-bound")).toBeInTheDocument();
    expect(
      screen.queryByTestId("run-config-max-concurrency"),
    ).not.toBeInTheDocument();
  });
});
