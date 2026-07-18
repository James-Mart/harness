import { expect, test } from "@playwright/test";

import { withFlickerProbe } from "./flicker-probe";

test("withFlickerProbe detects inline visibility flicker", async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html>
      <body>
        <div class="probe-target" style="visibility: visible">visible</div>
        <script>
          window.__toggleInterval = null;
          window.startVisibilityToggle = () => {
            const el = document.querySelector(".probe-target");
            let visible = true;
            window.__toggleInterval = setInterval(() => {
              visible = !visible;
              el.style.visibility = visible ? "visible" : "hidden";
            }, 16);
          };
          window.stopVisibilityToggle = () => {
            clearInterval(window.__toggleInterval);
            window.__toggleInterval = null;
          };
        </script>
      </body>
    </html>
  `);

  const { idle, interaction } = await withFlickerProbe(
    page,
    async () => {
      await page.evaluate(() => {
        (window as unknown as { startVisibilityToggle: () => void }).startVisibilityToggle();
      });
      await page.waitForTimeout(250);
      await page.evaluate(() => {
        (window as unknown as { stopVisibilityToggle: () => void }).stopVisibilityToggle();
      });
    },
    { selectors: [".probe-target"] },
  );

  expect(idle.frames).toBe(20);
  expect(idle.framesWithAnyHidden).toBe(0);
  expect(interaction.frames).toBeGreaterThan(0);
  expect(interaction.framesWithAnyHidden).toBeGreaterThan(0);
  expect(interaction.framesAllHidden).toBeGreaterThan(0);
  expect(interaction.maxHidden).toBe(1);
});
