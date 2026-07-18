import {
  isRunFixpoint,
  isSettled,
  settleAll,
  step,
  type RunState,
} from "@/sim/engine";

/**
 * Test helper: drive a run to fixpoint via repeated `step` + `settleAll`.
 * Not part of the public sim API (overlay uses step-driven primitives).
 */
export function runToFixpoint(state: RunState, maxSteps = 10_000): RunState {
  let next = state;
  for (let i = 0; i < maxSteps; i += 1) {
    if (isRunFixpoint(next) && isSettled(next)) {
      return next;
    }
    next = step(next);
    next = settleAll(next);
  }
  throw new Error(`runToFixpoint exceeded ${maxSteps} steps`);
}
