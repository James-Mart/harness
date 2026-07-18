/** Deterministic mulberry32 PRNG state (uint32). */
export type RngState = number;

/** Advance mulberry32; returns unit interval in [0, 1) and next state. */
export function nextUnitInterval(state: RngState): {
  value: number;
  state: RngState;
} {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return {
    value: ((t ^ (t >>> 14)) >>> 0) / 4294967296,
    state: next,
  };
}

/** Mutable closure RNG for ad-hoc tests; prefer `RngState` in `RunState`. */
export type Rng = () => number;

export function createSeededRng(seed: RngState): Rng {
  let state = seed >>> 0;
  return () => {
    const drawn = nextUnitInterval(state);
    state = drawn.state;
    return drawn.value;
  };
}

export const MIN_TRANSITION_MS = 1_000;
export const MAX_TRANSITION_MS = 5_000;

/** Random transition duration in [1000, 5000] ms, scaled by speed (>1 = faster). */
export function randomTransitionMs(
  state: RngState,
  speed = 1,
): { ms: number; state: RngState } {
  const { value, state: next } = nextUnitInterval(state);
  const span = MAX_TRANSITION_MS - MIN_TRANSITION_MS;
  const base = MIN_TRANSITION_MS + Math.floor(value * (span + 1));
  const factor = speed > 0 ? speed : 1;
  return { ms: Math.max(1, Math.round(base / factor)), state: next };
}
