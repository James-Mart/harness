import { expect, type Locator, type Page } from "@playwright/test";

/** Base seed URL used by selection e2e (top-level leaf + nested child). */
export const BASE_SEED_URL = "/?seed=base";

/** React Flow wrapper for a harness node id (not the inner flow-node-* shell). */
export function reactFlowNode(canvas: Locator, nodeId: string): Locator {
  return canvas.locator(`.react-flow__node[data-id="${nodeId}"]`);
}

/** Single-click the inner harness node shell scoped to the editor canvas. */
export async function clickHarnessNode(
  canvas: Locator,
  nodeId: string,
): Promise<void> {
  await canvas.getByTestId(`flow-node-${nodeId}`).click();
}

/** Empty inspector placeholder when nothing is selected. */
const EMPTY_INSPECTOR = "Select a node or edge to inspect.";

/** Assert the canvas starts with no RF selection and an empty inspector. */
export async function expectNoSelection(
  page: Page,
  canvas: Locator,
): Promise<void> {
  await expect(canvas.locator(".react-flow__node.selected")).toHaveCount(0);
  await expect(page.getByText(EMPTY_INSPECTOR)).toBeVisible();
}

/** Assert RF selection stamp and inspector title for a node. */
export async function expectNodeSelected(
  page: Page,
  canvas: Locator,
  nodeId: string,
  title: string,
): Promise<void> {
  await expect(reactFlowNode(canvas, nodeId)).toHaveClass(/selected/);
  await expect(page.getByTestId("inspector-title")).toHaveText(title);
}
