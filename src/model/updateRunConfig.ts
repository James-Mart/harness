import { parseOptionalPositiveInt } from "@/model/parseOptionalPositiveInt";
import type { Harness, NodeId, RunConfig } from "@/model/types";

/**
 * Run-config edits that never touch structure (nodes / edges / boundary).
 * Gate toggles are a separate surface; this covers concurrency + depth.
 */
export type RunConfigUpdate =
  | { field: "depthBound"; value: string }
  | { field: "containerMaxConcurrency"; containerId: NodeId; value: string };

function applyRunConfigUpdate(
  runConfig: RunConfig,
  update: RunConfigUpdate,
): RunConfig | null {
  switch (update.field) {
    case "depthBound": {
      const depthBound = parseOptionalPositiveInt(update.value);
      if (depthBound === runConfig.depthBound) return null;
      if (depthBound === undefined) {
        if (runConfig.depthBound === undefined) return null;
        const next = { ...runConfig };
        delete next.depthBound;
        return next;
      }
      return { ...runConfig, depthBound };
    }

    case "containerMaxConcurrency": {
      const maxConcurrency = parseOptionalPositiveInt(update.value);
      const current =
        runConfig.perContainer[update.containerId]?.maxConcurrency;
      if (maxConcurrency === current) return null;

      const perContainer = { ...runConfig.perContainer };
      if (maxConcurrency === undefined) {
        delete perContainer[update.containerId];
      } else {
        perContainer[update.containerId] = { maxConcurrency };
      }
      return { ...runConfig, perContainer };
    }
  }
}

/**
 * Apply a run-config edit. Structure fields keep the same references when
 * unchanged; only `runConfig` is replaced.
 */
export function updateRunConfig(
  harness: Harness,
  update: RunConfigUpdate,
): Harness {
  const nextConfig = applyRunConfigUpdate(harness.runConfig, update);
  if (nextConfig === null) return harness;
  return { ...harness, runConfig: nextConfig };
}
