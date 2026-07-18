import { test } from "@playwright/test";

import { expectEditorReady } from "./fixtures/editor";
import { withFlickerProbe } from "./flicker-probe";
import { expectNoFlicker, formatMetrics } from "./flicker-rule";
import { INTERACTION_CORPUS } from "./interactions";

/**
 * Interaction corpus: run each scripted gesture through the visibility
 * flicker probe and assert it does not flash relative to the page's idle
 * baseline. `drag-node` is the validated repro for
 * node-drag-flickers-in-edit-mode; the others guard nearby gestures.
 */
for (const [name, run] of Object.entries(INTERACTION_CORPUS)) {
  test(`no flicker: ${name}`, async ({ page }, testInfo) => {
    await page.goto("/");
    await expectEditorReady(page);

    const result = await withFlickerProbe(page, () => run(page));

    const summary = formatMetrics(name, result);
    testInfo.annotations.push({
      type: "flicker-metrics",
      description: summary,
    });
    console.log(summary);

    expectNoFlicker(name, result);
  });
}
