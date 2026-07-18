import type { Page } from "@playwright/test";

/**
 * Scripted, named interactions for the flicker corpus. Each drives a real
 * pointer gesture on the harness editor and paces itself so the in-page
 * `requestAnimationFrame` probe has time to sample the whole gesture, not
 * just its endpoints. Every entry uses the same {@link holdFrames} pacing
 * primitive so a fixed tolerance means comparable sensitivity across the
 * corpus.
 */

const DRAGGABLE_NODE = ".react-flow__node:not(.react-flow__node-harness)";

/**
 * Wall-clock pace between sampled steps. This is not rAF synchronization —
 * it just holds long enough (~one 60fps frame) that the probe's rAF sampler
 * captures the intervening state.
 */
const FRAME_HOLD_MS = 16;
/** Sampled steps spanning a drag path. */
const DRAG_STEPS = 40;
/** Frames held after a discrete event (click) to sample the settle window. */
const SETTLE_FRAMES = 20;
/** Inset from the canvas edge for background (gutter) pointer targets. */
const CANVAS_GUTTER_INSET = 24;

type Point = { x: number; y: number };

/** Hold for `frames` sampling windows so the probe can observe the page. */
async function holdFrames(page: Page, frames: number): Promise<void> {
  for (let i = 0; i < frames; i++) {
    await page.waitForTimeout(FRAME_HOLD_MS);
  }
}

async function centerOf(page: Page, selector: string): Promise<Point> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) {
    throw new Error(`No bounding box for selector: ${selector}`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A point in the canvas background gutter, clear of the fit-view graph. */
async function canvasGutterPoint(page: Page): Promise<Point> {
  const box = await page.getByTestId("editor-canvas").boundingBox();
  if (!box) {
    throw new Error("No bounding box for editor-canvas");
  }
  return { x: box.x + CANVAS_GUTTER_INSET, y: box.y + CANVAS_GUTTER_INSET };
}

/** Drag along a straight path in small sampled steps. */
async function dragAlong(
  page: Page,
  from: Point,
  delta: Point,
  steps = DRAG_STEPS,
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= steps; step++) {
    const progress = step / steps;
    await page.mouse.move(
      from.x + delta.x * progress,
      from.y + delta.y * progress,
    );
    await holdFrames(page, 1);
  }
  await page.mouse.up();
}

/** Pointer-drag a canvas node across the viewport (the validated repro). */
async function dragNode(page: Page): Promise<void> {
  const start = await centerOf(page, DRAGGABLE_NODE);
  await dragAlong(page, start, { x: 160, y: 90 });
}

/** Drag the pane background to pan the canvas. */
async function panCanvas(page: Page): Promise<void> {
  const from = await canvasGutterPoint(page);
  await dragAlong(page, from, { x: 140, y: 100 });
}

/** Select a node to open the inspector, then deselect by clicking the pane. */
async function openCloseInspector(page: Page): Promise<void> {
  await page.locator(DRAGGABLE_NODE).first().click();
  await holdFrames(page, SETTLE_FRAMES);
  const gutter = await canvasGutterPoint(page);
  await page.mouse.click(gutter.x, gutter.y);
  await holdFrames(page, SETTLE_FRAMES);
}

export type InteractionRunner = (page: Page) => Promise<void>;

export const INTERACTION_CORPUS = {
  "drag-node": dragNode,
  "pan-canvas": panCanvas,
  "open-close-inspector": openCloseInspector,
} as const satisfies Record<string, InteractionRunner>;

export type InteractionName = keyof typeof INTERACTION_CORPUS;
