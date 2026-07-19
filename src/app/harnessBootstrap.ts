import {
  createBaseSeedHarness,
  createBranchingSeedHarness,
  createEunomioSeedHarness,
  createTrackerSeedHarness,
  createWiringCueDemoHarness,
  createWorkPoolCueDemoHarness,
  createWorkPoolSeedHarness,
  EUNOMIO_HARNESS_ID,
  TRACKER_HARNESS_ID,
  type Harness,
} from "@/model";

export type HarnessSeedKey = "tracker" | "eunomio";

const HARNESS_SEEDS: Record<HarnessSeedKey, () => Harness> = {
  tracker: createTrackerSeedHarness,
  eunomio: createEunomioSeedHarness,
};

/** Stable harness ids for Tracker | Eunomio seeds. */
export const HARNESS_SEED_IDS: Record<HarnessSeedKey, string> = {
  tracker: TRACKER_HARNESS_ID,
  eunomio: EUNOMIO_HARNESS_ID,
};

export type HarnessBootstrap = {
  /**
   * Dev-only demo override from `?seed=` (base / workpool / branching / …).
   * When set, the Tracker | Eunomio toggle is hidden.
   */
  demoHarness?: Harness;
  /** Active real-harness seed when no demo override is present. */
  seedKey: HarnessSeedKey;
};

/** Build the harness for a Tracker | Eunomio seed key. */
export function createHarnessForSeed(seedKey: HarnessSeedKey): Harness {
  return HARNESS_SEEDS[seedKey]();
}

/** Resolve the stable id for a Tracker | Eunomio seed key. */
export function harnessIdForSeed(seedKey: HarnessSeedKey): string {
  return HARNESS_SEED_IDS[seedKey];
}

/**
 * Read initial harness selection from the URL (dev) or default to tracker.
 * Single place for `?seed=` handling.
 */
export function readHarnessBootstrap(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): HarnessBootstrap {
  if (!import.meta.env.DEV) {
    return { seedKey: "tracker" };
  }

  const seed = new URLSearchParams(search).get("seed");
  switch (seed) {
    case "wiring-cues":
      return {
        demoHarness: createWiringCueDemoHarness(),
        seedKey: "tracker",
      };
    case "workpool-cues":
      return {
        demoHarness: createWorkPoolCueDemoHarness(),
        seedKey: "tracker",
      };
    case "workpool":
      return { demoHarness: createWorkPoolSeedHarness(), seedKey: "tracker" };
    case "branching":
      return { demoHarness: createBranchingSeedHarness(), seedKey: "tracker" };
    case "base":
      return { demoHarness: createBaseSeedHarness(), seedKey: "tracker" };
    case "eunomio":
      return { seedKey: "eunomio" };
    case "tracker":
    default:
      return { seedKey: "tracker" };
  }
}
