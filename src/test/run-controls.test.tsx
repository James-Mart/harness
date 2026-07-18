import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditorLayout } from "@/components/layout/EditorLayout";
import { createWorkPoolSeedHarness } from "@/model";
import { pendingDurations, type RunState } from "@/sim";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Edit/Run controls", () => {
  it("toggles Edit/Run and enables step-based controls only in Run", () => {
    render(<EditorLayout />);

    const controls = screen.getByTestId("run-controls");
    expect(controls).toHaveAttribute("data-editor-mode", "edit");
    expect(screen.getByTestId("run-step")).toBeDisabled();
    expect(screen.getByTestId("run-reset")).toBeDisabled();
    expect(screen.getByTestId("run-speed")).toBeDisabled();

    fireEvent.click(screen.getByTestId("mode-run"));
    expect(controls).toHaveAttribute("data-editor-mode", "run");
    expect(screen.getByTestId("run-step")).toBeEnabled();
    expect(screen.getByTestId("run-reset")).toBeEnabled();
    expect(screen.getByTestId("run-speed")).toBeEnabled();
    expect(controls).toHaveAttribute("data-run-status", "idle");

    fireEvent.click(screen.getByTestId("mode-edit"));
    expect(controls).toHaveAttribute("data-editor-mode", "edit");
    expect(screen.getByTestId("run-step")).toBeDisabled();
  });

  it("Step starts staggered transitions; Reset restores the ready set", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "performance"] });
    const snapshots: Array<RunState | null> = [];

    render(
      <EditorLayout
        initialHarness={createWorkPoolSeedHarness()}
        onRunStateChange={(state) => {
          snapshots.push(state);
        }}
      />,
    );

    fireEvent.click(screen.getByTestId("mode-run"));
    const idle = snapshots.at(-1);
    expect(idle?.status).toBe("idle");
    expect(idle?.pools.pool).toEqual({
      ready: ["root-a", "root-b"],
      inFlight: [],
      done: [],
    });

    fireEvent.click(screen.getByTestId("run-step"));
    const afterStep = snapshots.at(-1)!;
    expect(afterStep.status).toBe("running");
    expect(Object.keys(afterStep.cursors).sort()).toEqual(["root-a", "root-b"]);
    const durations = pendingDurations(afterStep);
    expect(durations["root-a"]).not.toEqual(durations["root-b"]);
    expect(screen.getByTestId("run-step")).toBeDisabled();

    // Advance wall clock past both landings.
    const maxLand = Math.max(
      afterStep.cursors["root-a"]!.pending!.landsAtMs,
      afterStep.cursors["root-b"]!.pending!.landsAtMs,
    );
    await vi.advanceTimersByTimeAsync(maxLand + 50);
    await waitFor(() => {
      expect(snapshots.at(-1)?.status).not.toBe("running");
    });
    const settled = snapshots.at(-1)!;
    expect(Object.keys(settled.cursors)).toHaveLength(0);
    expect([...(settled.pools.pool?.done ?? [])].sort()).toEqual([
      "root-a",
      "root-b",
    ]);
    expect(screen.getByTestId("run-step")).toBeEnabled();

    fireEvent.click(screen.getByTestId("run-reset"));
    const reset = snapshots.at(-1)!;
    expect(reset.status).toBe("idle");
    expect(reset.pools.pool).toEqual({
      ready: ["root-a", "root-b"],
      inFlight: [],
      done: [],
    });
    expect(reset.nowMs).toBe(0);
  });

  it("speed multiplier shortens pending transition durations", () => {
    const slow: Array<RunState | null> = [];
    const { unmount } = render(
      <EditorLayout
        initialHarness={createWorkPoolSeedHarness()}
        onRunStateChange={(state) => {
          slow.push(state);
        }}
      />,
    );

    fireEvent.click(screen.getByTestId("mode-run"));
    fireEvent.click(screen.getByTestId("run-step"));
    const slowDurations = pendingDurations(slow.at(-1)!);
    unmount();

    const fast: Array<RunState | null> = [];
    render(
      <EditorLayout
        initialHarness={createWorkPoolSeedHarness()}
        onRunStateChange={(state) => {
          fast.push(state);
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("mode-run"));
    fireEvent.change(screen.getByTestId("run-speed"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByTestId("run-step"));
    const fastDurations = pendingDurations(fast.at(-1)!);

    expect(fastDurations["root-a"]).toBeLessThan(slowDurations["root-a"]!);
    expect(fastDurations["root-b"]).toBeLessThan(slowDurations["root-b"]!);
  });

  it("locks palette and inspector while in Run mode", () => {
    render(
      <EditorLayout
        initialHarness={createWorkPoolSeedHarness()}
        initialSelectedNodeIds={["fanOut"]}
      />,
    );
    expect(screen.getByTestId("palette-item-implementor")).toBeEnabled();
    expect(screen.getByTestId("inspector-field-title")).toBeEnabled();
    expect(screen.getByTestId("run-config-depth-bound")).toBeEnabled();
    expect(screen.getByTestId("inspector-delete")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("mode-run"));
    expect(screen.getByTestId("palette-item-implementor")).toBeDisabled();
    expect(screen.getByTestId("inspector-field-title")).toBeDisabled();
    expect(screen.getByTestId("run-config-depth-bound")).toBeDisabled();
    expect(screen.queryByTestId("inspector-delete")).not.toBeInTheDocument();
  });
});
