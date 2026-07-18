import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  containerLedger,
  cursorTokens,
  doneContainerIds,
  flowNodeRects,
  CURSOR_LANE_GAP,
} from "@/authoring/runOverlayModel";
import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import { EditorLayout } from "@/components/layout/EditorLayout";
import { createWorkPoolSeedHarness } from "@/model";
import {
  advanceTime,
  createRunState,
  isRunFixpoint,
  scriptForHarness,
  settleAll,
  step,
} from "@/sim";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function startWorkPoolRun() {
  const harness = createWorkPoolSeedHarness();
  const rects = flowNodeRects(harnessToFlowNodes(harness));
  const state = createRunState({
    harness,
    script: scriptForHarness(harness),
    seed: 1,
  });
  return { harness, rects, state };
}

describe("run overlay model", () => {
  it("draws one lane-separated cursor per concurrent in-flight item", () => {
    const { rects, state } = startWorkPoolRun();
    const afterStep = step(state);

    expect(Object.keys(afterStep.cursors).sort()).toEqual(["root-a", "root-b"]);

    const tokens = cursorTokens(afterStep, rects);
    expect(tokens.map((t) => t.itemId)).toEqual(["root-a", "root-b"]);
    // Both originate on the single fanOut body node (progress 0) but are
    // spread into distinct horizontal lanes.
    expect(Math.abs(tokens[0]!.x - tokens[1]!.x)).toBeCloseTo(CURSOR_LANE_GAP);
    expect(tokens.every((t) => t.phase === "completing")).toBe(true);
  });

  it("advances cursors to their next state at staggered rates", () => {
    const { rects, state } = startWorkPoolRun();
    const afterStep = step(state);

    const durA = afterStep.cursors["root-a"]!.pending!.durationMs;
    const durB = afterStep.cursors["root-b"]!.pending!.durationMs;
    expect(durA).not.toEqual(durB);

    // Same wall time, different durations → different progress (staggered).
    const mid = advanceTime(afterStep, Math.min(durA, durB) / 2);
    const tokens = cursorTokens(mid, rects);
    const a = tokens.find((t) => t.itemId === "root-a")!;
    const b = tokens.find((t) => t.itemId === "root-b")!;
    expect(a.progress).toBeGreaterThan(0);
    expect(b.progress).toBeGreaterThan(0);
    expect(a.progress).not.toBeCloseTo(b.progress);
  });

  it("tracks the pool growing then reaching a dimmed fixpoint", () => {
    const { state } = startWorkPoolRun();

    const idle = containerLedger(state);
    expect(idle.find((r) => r.containerId === "pool")).toMatchObject({
      ready: 2,
      inFlight: 0,
      done: 0,
      fixpoint: false,
    });
    expect(doneContainerIds(state)).toEqual([]);

    // First round: roots run, fan out into the live pool (pool grows).
    const grown = settleAll(step(state));
    const grownPool = containerLedger(grown).find(
      (r) => r.containerId === "pool",
    )!;
    expect(grownPool.done).toBe(2);
    expect(grownPool.ready).toBe(3);
    expect(grownPool.fixpoint).toBe(false);

    // Second round drains the spawned children to fixpoint.
    const settled = settleAll(step(grown));
    expect(isRunFixpoint(settled)).toBe(true);
    const finalPool = containerLedger(settled).find(
      (r) => r.containerId === "pool",
    )!;
    expect(finalPool).toMatchObject({ ready: 0, inFlight: 0, done: 5 });
    expect(doneContainerIds(settled)).toContain("pool");
  });
});

describe("run overlay rendering", () => {
  it("renders concurrent cursors and a live pool ledger in Run mode", () => {
    render(<EditorLayout initialHarness={createWorkPoolSeedHarness()} />);

    fireEvent.click(screen.getByTestId("mode-run"));
    fireEvent.click(screen.getByTestId("run-step"));

    expect(screen.getByTestId("run-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("run-cursor-root-a")).toBeInTheDocument();
    expect(screen.getByTestId("run-cursor-root-b")).toBeInTheDocument();

    const ledgerRow = screen.getByTestId("run-ledger-pool");
    expect(ledgerRow).toHaveAttribute("data-in-flight", "2");
  });

  it("reaches a clear terminal fixpoint state with a dimmed body", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "performance"] });

    render(<EditorLayout initialHarness={createWorkPoolSeedHarness()} />);
    fireEvent.click(screen.getByTestId("mode-run"));

    const drainRound = async () => {
      fireEvent.click(screen.getByTestId("run-step"));
      await vi.advanceTimersByTimeAsync(6000);
      await waitFor(() =>
        expect(screen.getByTestId("run-controls")).not.toHaveAttribute(
          "data-run-status",
          "running",
        ),
      );
    };

    await drainRound();
    await drainRound();

    await waitFor(() =>
      expect(screen.getByTestId("run-controls")).toHaveAttribute(
        "data-run-status",
        "fixpoint",
      ),
    );

    expect(screen.getByTestId("run-fixpoint")).toBeInTheDocument();
    expect(screen.getByTestId("run-done-pool")).toBeInTheDocument();
    const ledger = screen.getByTestId("run-ledger");
    expect(within(ledger).getByTestId("run-ledger-pool")).toHaveAttribute(
      "data-done",
      "5",
    );
  });
});
