import { describe, expect, it } from "vitest";

import type {
  FlickerMetrics,
  FlickerProbeResult,
} from "../../e2e/flicker-probe";
import {
  INTERACTION_HIDDEN_FRAME_TOLERANCE,
  evaluateFlicker,
  expectNoFlicker,
} from "../../e2e/flicker-rule";

function metrics(framesWithAnyHidden: number, frames: number): FlickerMetrics {
  return {
    frames,
    framesWithAnyHidden,
    framesAllHidden: framesWithAnyHidden,
    maxHidden: framesWithAnyHidden > 0 ? 8 : 0,
  };
}

function result(
  idleHidden: number,
  idleFrames: number,
  interactionHidden: number,
  interactionFrames: number,
): FlickerProbeResult {
  return {
    idle: metrics(idleHidden, idleFrames),
    interaction: metrics(interactionHidden, interactionFrames),
  };
}

/** Measured truth from validating against node-drag-flickers-in-edit-mode. */
const BUGGY_DRAG = result(0, 20, 40, 92);
const FIXED_DRAG = result(0, 20, 2, 84);

describe("flicker fail rule", () => {
  it("rejects the measured buggy drag metrics", () => {
    expect(evaluateFlicker(BUGGY_DRAG).pass).toBe(false);
    expect(() => expectNoFlicker("drag-node", BUGGY_DRAG)).toThrow(
      /visibility flicker/,
    );
  });

  it("accepts the measured fixed drag metrics", () => {
    expect(evaluateFlicker(FIXED_DRAG).pass).toBe(true);
    expect(() => expectNoFlicker("drag-node", FIXED_DRAG)).not.toThrow();
  });

  it("is relative to the idle baseline, not an absolute count", () => {
    // Same 8 interaction-hidden frames: fails against a quiet page, passes
    // when the page is already noisy at idle.
    expect(evaluateFlicker(result(0, 20, 8, 84)).pass).toBe(false);
    expect(evaluateFlicker(result(5, 20, 8, 84)).pass).toBe(true);
  });

  it("treats idle + tolerance as the inclusive pass boundary", () => {
    const limit = INTERACTION_HIDDEN_FRAME_TOLERANCE;
    expect(evaluateFlicker(result(0, 20, limit, 84)).pass).toBe(true);
    expect(evaluateFlicker(result(0, 20, limit + 1, 84)).pass).toBe(false);
  });

  it("fails closed when no interaction frames were sampled", () => {
    const noFrames = result(0, 20, 0, 0);
    expect(evaluateFlicker(noFrames).pass).toBe(false);
    expect(() => expectNoFlicker("drag-node", noFrames)).toThrow(
      /no sampled frames/,
    );
  });
});
