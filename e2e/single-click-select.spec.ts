import { expect, test } from "@playwright/test";

import { expectEditorReady } from "./fixtures/editor";
import {
  BASE_SEED_URL,
  clickHarnessNode,
  expectNoSelection,
  expectNodeSelected,
  reactFlowNode,
} from "./fixtures/selection";

const CASES = [
  {
    name: "selects a top-level leaf on a single click",
    clickId: "source",
    title: "List source",
  },
  {
    name: "selects a nested child instead of its container",
    clickId: "worker",
    title: "Implementor",
    parentNotSelected: "loop",
  },
] as const;

test.describe("single-click node selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_SEED_URL);
    await expectEditorReady(page);
  });

  for (const { name, clickId, title, ...rest } of CASES) {
    test(name, async ({ page }) => {
      const canvas = page.getByTestId("editor-canvas");
      await expectNoSelection(page, canvas);

      await clickHarnessNode(canvas, clickId);

      await expectNodeSelected(page, canvas, clickId, title);
      if ("parentNotSelected" in rest) {
        await expect(
          reactFlowNode(canvas, rest.parentNotSelected),
        ).not.toHaveClass(/selected/);
      }
    });
  }
});
