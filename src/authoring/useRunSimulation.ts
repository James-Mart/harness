import { useCallback, useEffect, useRef, useState } from "react";

import type { Harness } from "@/model/types";
import {
  advanceTime,
  createRunState,
  isRunFixpoint,
  isSettled,
  step,
  type RunState,
} from "@/sim/engine";
import { scriptForHarness } from "@/sim/scripts";

export type EditorMode = "edit" | "run";

const DEFAULT_SEED = 1;

export type UseRunSimulationOptions = {
  harness: Harness;
  /** Observes mode (tests / demos). */
  onModeChange?: (mode: EditorMode) => void;
  /** Observes run state (tests / overlay). */
  onRunStateChange?: (state: RunState | null) => void;
};

/**
 * Edit/Run mode plus step-driven mock simulation clock.
 * Wall-clock rAF advances `nowMs` until pending transitions settle.
 */
export function useRunSimulation({
  harness,
  onModeChange,
  onRunStateChange,
}: UseRunSimulationOptions) {
  const [mode, setModeState] = useState<EditorMode>("edit");
  const [speed, setSpeedState] = useState(1);
  const [runState, setRunState] = useState<RunState | null>(null);

  const runStateRef = useRef<RunState | null>(null);
  const rafRef = useRef<number | null>(null);
  const animRef = useRef<{ wall0: number; sim0: number } | null>(null);
  /** Harness snapshot taken when entering Run (edits are frozen in Run). */
  const runHarnessRef = useRef<Harness | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const publish = useCallback(
    (next: RunState | null) => {
      runStateRef.current = next;
      setRunState(next);
      onRunStateChange?.(next);
    },
    [onRunStateChange],
  );

  const stopClock = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    animRef.current = null;
  }, []);

  const tick = useCallback(
    (wallNow: number) => {
      const anim = animRef.current;
      const current = runStateRef.current;
      if (!anim || !current) return;

      const target = anim.sim0 + (wallNow - anim.wall0);
      const next = advanceTime(current, Math.max(current.nowMs, target));
      publish(next);

      if (!isSettled(next)) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = null;
        rafRef.current = null;
      }
    },
    [publish],
  );

  const startClock = useCallback(
    (state: RunState) => {
      stopClock();
      if (isSettled(state)) return;
      animRef.current = { wall0: performance.now(), sim0: state.nowMs };
      rafRef.current = requestAnimationFrame(tick);
    },
    [stopClock, tick],
  );

  const startRun = useCallback((snap: Harness, nextSpeed: number): RunState => {
    return createRunState({
      harness: snap,
      script: scriptForHarness(snap),
      seed: DEFAULT_SEED,
      speed: nextSpeed,
    });
  }, []);

  useEffect(() => () => stopClock(), [stopClock]);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const setMode = useCallback(
    (next: EditorMode) => {
      if (next === mode) return;
      stopClock();
      if (next === "run") {
        runHarnessRef.current = harness;
        publish(startRun(harness, speedRef.current));
      } else {
        runHarnessRef.current = null;
        publish(null);
      }
      setModeState(next);
    },
    [harness, mode, publish, startRun, stopClock],
  );

  const onStep = useCallback(() => {
    const current = runStateRef.current;
    if (!current || !isSettled(current) || isRunFixpoint(current)) return;
    const next = step(current);
    publish(next);
    startClock(next);
  }, [publish, startClock]);

  const onReset = useCallback(() => {
    const snap = runHarnessRef.current;
    if (!snap) return;
    stopClock();
    publish(startRun(snap, speedRef.current));
  }, [publish, startRun, stopClock]);

  const setSpeed = useCallback(
    (nextSpeed: number) => {
      const factor = nextSpeed > 0 ? nextSpeed : 1;
      setSpeedState(factor);
      const current = runStateRef.current;
      // Speed is applied on the next `step` draw; in-flight durations stay put.
      if (current) publish({ ...current, speed: factor });
    },
    [publish],
  );

  const canStep =
    mode === "run" &&
    runState != null &&
    isSettled(runState) &&
    !isRunFixpoint(runState);

  return {
    mode,
    setMode,
    speed,
    setSpeed,
    runState,
    onStep,
    onReset,
    canStep,
    /** True in Run mode — authoring panes should lock interaction. */
    readOnly: mode === "run",
  };
}
