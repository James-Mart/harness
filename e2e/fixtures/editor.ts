import { expect, type Page } from "@playwright/test";

/** Gate for specs that need the harness editor canvas with rendered nodes. */
export async function expectEditorReady(page: Page) {
  await expect(page.getByTestId("mode-edit")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const canvas = page.getByTestId("editor-canvas");
  await expect(canvas).toBeVisible();

  const nodes = canvas.locator(".react-flow__node");
  await expect(nodes.first()).toBeVisible();
}
