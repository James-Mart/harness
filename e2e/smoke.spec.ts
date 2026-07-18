import { test } from "@playwright/test";

import { expectEditorReady } from "./fixtures/editor";

test("loads harness editor in Edit mode", async ({ page }) => {
  await page.goto("/");
  await expectEditorReady(page);
});
