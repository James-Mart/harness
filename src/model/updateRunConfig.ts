import { parseOptionalPositiveInt } from "@/model/parseOptionalPositiveInt";
import type { Harness, NodeId, RunConfig } from "@/model/types";

/**
 * Run-config edits that never touch structure (nodes / edges / boundary):
 * concurrency, depth, and per-gate enable/disable.
 */
export type RunConfigUpdate =
  | { field: "depthBound"; value: string }
  | { field: "containerMaxConcurrency"; containerId: NodeId; value: string }
  | { field: "gateEnabled"; gateId: NodeId; enabled: boolean };

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

    case "gateEnabled": {
      const existing = runConfig.gates[update.gateId];
      if (update.enabled) {
        // Enabled is the default — drop any override.
        if (existing === undefined) return null;
        const gates = { ...runConfig.gates };
        delete gates[update.gateId];
        return { ...runConfig, gates };
      }
      if (existing !== undefined) return null;
      return {
        ...runConfig,
        gates: { ...runConfig.gates, [update.gateId]: { enabled: false } },
      };
    }
  }
}

function isGateNode(harness: Harness, gateId: NodeId): boolean {
  const node = harness.nodes.find((entry) => entry.id === gateId);
  return node?.kind === "leaf" && node.isGate === true;
}

/**
 * Apply a run-config edit. Structure fields keep the same references when
 * unchanged; only `runConfig` is replaced.
 */
export function updateRunConfig(
  harness: Harness,
  update: RunConfigUpdate,
): Harness {
  if (update.field === "gateEnabled" && !isGateNode(harness, update.gateId)) {
    return harness;
  }
  const nextConfig = applyRunConfigUpdate(harness.runConfig, update);
  if (nextConfig === null) return harness;
  return { ...harness, runConfig: nextConfig };
}
