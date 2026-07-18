import type { FlickerProbeResult } from "./flicker-probe";

/**
 * Flicker fail rule (recorded threshold).
 *
 * A scripted interaction FAILS when the number of frames with any hidden
 * probe element during the interaction meaningfully exceeds the idle
 * baseline sampled on the same page:
 *
 *   interaction.framesWithAnyHidden <= idle.framesWithAnyHidden + TOLERANCE
 *
 * The threshold is calibrated against the validated `drag-node` repro for
 * node-drag-flickers-in-edit-mode, measured on this corpus (8-node default
 * harness, ~85 sampled drag frames):
 *
 *   - WITH the bug: 40/92 hidden frames (allHidden=40) — a per-move flash.
 *   - WITH the fix:  2/84 hidden frames (a one-time drag-start re-init of
 *                    the just-selected node), idle baseline 0.
 *
 * A real flicker hides nodes across a large fraction of the interaction, so
 * TOLERANCE only needs to absorb the small, one-time drag-start transient
 * without masking the ~40-frame buggy signal — leaving an order-of-magnitude
 * gap between pass (<=5) and fail (~40).
 *
 * This module is Playwright-free so the rule can be exercised directly by the
 * unit suite over synthetic metrics (see `src/test/flicker-rule.test.ts`).
 */
export const INTERACTION_HIDDEN_FRAME_TOLERANCE = 5;

export type ProbeResult = FlickerProbeResult;

export type FlickerVerdict = {
  /** True when the interaction stays within the idle-relative limit. */
  pass: boolean;
  /** Max allowed hidden frames: idle baseline + tolerance. */
  limit: number;
  idleHidden: number;
  interactionHidden: number;
  sampledFrames: number;
};

/** Pure fail-rule evaluation over probe metrics; no test-runner deps. */
export function evaluateFlicker(result: ProbeResult): FlickerVerdict {
  const { idle, interaction } = result;
  const limit = idle.framesWithAnyHidden + INTERACTION_HIDDEN_FRAME_TOLERANCE;
  const sampledFrames = interaction.frames;
  const pass = sampledFrames > 0 && interaction.framesWithAnyHidden <= limit;
  return {
    pass,
    limit,
    idleHidden: idle.framesWithAnyHidden,
    interactionHidden: interaction.framesWithAnyHidden,
    sampledFrames,
  };
}

/** Human-readable one-line metrics summary for test output / evidence. */
export function formatMetrics(name: string, result: ProbeResult): string {
  const { idle, interaction } = result;
  return (
    `[flicker] ${name}: ` +
    `idle ${idle.framesWithAnyHidden}/${idle.frames} hidden-frames, ` +
    `interaction ${interaction.framesWithAnyHidden}/${interaction.frames} hidden-frames ` +
    `(allHidden=${interaction.framesAllHidden}, maxHidden=${interaction.maxHidden})`
  );
}

/**
 * Assert an interaction does not flicker relative to its idle baseline.
 * Throws a descriptive Error on failure (reported as a test failure by any
 * runner); pure so it is shared by the e2e corpus and the unit suite.
 */
export function expectNoFlicker(name: string, result: ProbeResult): void {
  const verdict = evaluateFlicker(result);
  if (verdict.sampledFrames <= 0) {
    throw new Error(`${name}: interaction produced no sampled frames`);
  }
  if (!verdict.pass) {
    throw new Error(
      `${name}: ${verdict.interactionHidden} hidden frames during interaction ` +
        `exceeds idle baseline ${verdict.idleHidden} + tolerance ${INTERACTION_HIDDEN_FRAME_TOLERANCE} ` +
        `(= ${verdict.limit}); indicates a visibility flicker`,
    );
  }
}
