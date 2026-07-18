import type { Page } from "@playwright/test";

export type FlickerProbeOptions = {
  selectors?: string[];
};

export type FlickerMetrics = {
  frames: number;
  framesWithAnyHidden: number;
  framesAllHidden: number;
  maxHidden: number;
};

const DEFAULT_SELECTORS = [".react-flow__node"];
const IDLE_FRAME_COUNT = 20;
const FLICKER_PROBE_KEY = "__flickerProbe";

type InPageFlickerProbe = {
  sampleFrames: (selectors: string[], frameCount: number) => Promise<FlickerMetrics>;
  startContinuous: (selectors: string[]) => void;
  stopContinuous: () => FlickerMetrics;
};

type FlickerProbeWindow = Window & {
  [FLICKER_PROBE_KEY]?: InPageFlickerProbe;
};

function emptyMetrics(): FlickerMetrics {
  return {
    frames: 0,
    framesWithAnyHidden: 0,
    framesAllHidden: 0,
    maxHidden: 0,
  };
}

function installFlickerProbe(): void {
  const probeKey = "__flickerProbe";
  const flickerWindow = window as FlickerProbeWindow;
  if (flickerWindow[probeKey]) {
    return;
  }

  const createMetrics = () => ({
    frames: 0,
    framesWithAnyHidden: 0,
    framesAllHidden: 0,
    maxHidden: 0,
  });

  const collectMatching = (selectorList: string[]) => {
    const seen = new Set<Element>();
    const elements: Element[] = [];
    for (const selector of selectorList) {
      for (const el of document.querySelectorAll(selector)) {
        if (!seen.has(el)) {
          seen.add(el);
          elements.push(el);
        }
      }
    }
    return elements;
  };

  const countVisibility = (elements: Element[]) => {
    let inlineHidden = 0;
    let computedHidden = 0;
    for (const el of elements) {
      if (!(el instanceof HTMLElement)) {
        continue;
      }
      if (el.style.visibility === "hidden") {
        inlineHidden++;
      }
      if (getComputedStyle(el).visibility === "hidden") {
        computedHidden++;
      }
    }
    return { inlineHidden, computedHidden };
  };

  const recordFrame = (
    metrics: FlickerMetrics,
    hiddenCount: number,
    total: number,
  ) => {
    metrics.frames++;
    if (hiddenCount > 0) {
      metrics.framesWithAnyHidden++;
    }
    if (total > 0 && hiddenCount === total) {
      metrics.framesAllHidden++;
    }
    if (hiddenCount > metrics.maxHidden) {
      metrics.maxHidden = hiddenCount;
    }
  };

  let continuous:
    | {
        running: boolean;
        selectors: string[];
        metrics: FlickerMetrics;
        computedMetrics: FlickerMetrics;
      }
    | undefined;

  flickerWindow[probeKey] = {
    sampleFrames(selectors, frameCount) {
      const metrics = createMetrics();
      const computedMetrics = createMetrics();

      return new Promise<FlickerMetrics>((resolve) => {
        let collected = 0;

        const tick = () => {
          const elements = collectMatching(selectors);
          const { inlineHidden, computedHidden } = countVisibility(elements);
          recordFrame(metrics, inlineHidden, elements.length);
          recordFrame(computedMetrics, computedHidden, elements.length);
          collected++;

          if (collected >= frameCount) {
            resolve(metrics);
            return;
          }

          requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
      });
    },

    startContinuous(selectors) {
      if (continuous?.running) {
        continuous.running = false;
      }

      continuous = {
        running: true,
        selectors,
        metrics: createMetrics(),
        computedMetrics: createMetrics(),
      };

      const tick = () => {
        if (!continuous?.running) {
          return;
        }

        const elements = collectMatching(continuous.selectors);
        const { inlineHidden, computedHidden } = countVisibility(elements);
        recordFrame(continuous.metrics, inlineHidden, elements.length);
        recordFrame(continuous.computedMetrics, computedHidden, elements.length);
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    },

    stopContinuous() {
      if (!continuous) {
        return createMetrics();
      }

      continuous.running = false;
      const metrics = continuous.metrics;
      continuous = undefined;
      return metrics;
    },
  };
}

async function ensureFlickerProbe(page: Page): Promise<void> {
  await page.addInitScript(installFlickerProbe);
  await page.evaluate(installFlickerProbe);
}

function getProbe(page: Page) {
  return {
    sampleFrames: (selectors: string[], frameCount: number) =>
      page.evaluate(
        ({ probeKey, selectors: sels, frameCount: count }) => {
          const probe = (window as FlickerProbeWindow)[probeKey];
          if (!probe) {
            throw new Error("Flicker probe is not installed");
          }
          return probe.sampleFrames(sels, count);
        },
        {
          probeKey: FLICKER_PROBE_KEY,
          selectors,
          frameCount,
        },
      ),
    startContinuous: (selectors: string[]) =>
      page.evaluate(
        ({ probeKey, selectors: sels }) => {
          const probe = (window as FlickerProbeWindow)[probeKey];
          if (!probe) {
            throw new Error("Flicker probe is not installed");
          }
          probe.startContinuous(sels);
        },
        { probeKey: FLICKER_PROBE_KEY, selectors },
      ),
    stopContinuous: () =>
      page.evaluate(({ probeKey }) => {
        const probe = (window as FlickerProbeWindow)[probeKey];
        if (!probe) {
          return {
            frames: 0,
            framesWithAnyHidden: 0,
            framesAllHidden: 0,
            maxHidden: 0,
          };
        }
        return probe.stopContinuous();
      }, { probeKey: FLICKER_PROBE_KEY }),
  };
}

export async function withFlickerProbe(
  page: Page,
  interaction: () => Promise<void>,
  options?: FlickerProbeOptions,
): Promise<{ interaction: FlickerMetrics; idle: FlickerMetrics }> {
  const selectors = options?.selectors ?? DEFAULT_SELECTORS;

  await ensureFlickerProbe(page);
  const probe = getProbe(page);

  const idle = await probe.sampleFrames(selectors, IDLE_FRAME_COUNT);
  await probe.startContinuous(selectors);

  let interactionError: unknown;
  let interactionMetrics = emptyMetrics();

  try {
    await interaction();
  } catch (error) {
    interactionError = error;
  } finally {
    interactionMetrics = await probe.stopContinuous();
  }

  if (interactionError !== undefined) {
    throw interactionError;
  }

  return { interaction: interactionMetrics, idle };
}
