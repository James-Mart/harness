import { describe, expect, it } from "vitest";

import {
  createBaseSeedHarness,
  createBranchingSeedHarness,
  createWorkPoolSeedHarness,
  effectiveConcurrency,
  isGateEnabled,
  updateRunConfig,
  type ContainerNode,
  type Harness,
} from "@/model";

/** Structure identity: everything except runConfig. */
function structureOf(harness: Harness) {
  return {
    id: harness.id,
    title: harness.title,
    boundary: harness.boundary,
    nodes: harness.nodes,
    edges: harness.edges,
  };
}

describe("updateRunConfig", () => {
  it("edits depthBound without changing structure", () => {
    const harness = createBaseSeedHarness();
    const before = structureOf(harness);

    const next = updateRunConfig(harness, {
      field: "depthBound",
      value: "5",
    });

    expect(next.runConfig.depthBound).toBe(5);
    expect(structureOf(next)).toEqual(before);
    expect(next.nodes).toBe(harness.nodes);
    expect(next.edges).toBe(harness.edges);
    expect(next.boundary).toBe(harness.boundary);
  });

  it("edits per-container maxConcurrency without changing structure", () => {
    const harness = createWorkPoolSeedHarness();
    const before = structureOf(harness);
    const pool = harness.nodes.find(
      (node): node is ContainerNode =>
        node.id === "pool" && node.kind === "container",
    );
    expect(pool).toBeDefined();
    if (!pool) return;

    const next = updateRunConfig(harness, {
      field: "containerMaxConcurrency",
      containerId: "pool",
      value: "2",
    });

    expect(next.runConfig.perContainer.pool).toEqual({ maxConcurrency: 2 });
    expect(structureOf(next)).toEqual(before);
    expect(next.nodes).toBe(harness.nodes);
    expect(next.edges).toBe(harness.edges);
    expect(effectiveConcurrency(next, pool)).toEqual({
      kind: "parallel",
      maxConcurrency: 2,
    });
  });

  it("clears depthBound and container override with empty input", () => {
    const harness = updateRunConfig(
      updateRunConfig(createWorkPoolSeedHarness(), {
        field: "depthBound",
        value: "3",
      }),
      {
        field: "containerMaxConcurrency",
        containerId: "pool",
        value: "2",
      },
    );

    const clearedDepth = updateRunConfig(harness, {
      field: "depthBound",
      value: "",
    });
    expect(clearedDepth.runConfig.depthBound).toBeUndefined();
    expect(clearedDepth.nodes).toBe(harness.nodes);

    const clearedMax = updateRunConfig(clearedDepth, {
      field: "containerMaxConcurrency",
      containerId: "pool",
      value: "",
    });
    expect(clearedMax.runConfig.perContainer).toEqual({});
    expect(clearedMax.nodes).toBe(clearedDepth.nodes);
  });

  it("returns the same harness reference when nothing changes", () => {
    const harness = updateRunConfig(createBaseSeedHarness(), {
      field: "depthBound",
      value: "4",
    });
    expect(updateRunConfig(harness, { field: "depthBound", value: "4" })).toBe(
      harness,
    );
  });

  it("toggles a gate without changing structure", () => {
    const harness = createBranchingSeedHarness();
    const before = structureOf(harness);
    expect(isGateEnabled(harness.runConfig, "gate")).toBe(true);

    const disabled = updateRunConfig(harness, {
      field: "gateEnabled",
      gateId: "gate",
      enabled: false,
    });

    expect(disabled.runConfig.gates.gate).toEqual({ enabled: false });
    expect(isGateEnabled(disabled.runConfig, "gate")).toBe(false);
    expect(structureOf(disabled)).toEqual(before);
    expect(disabled.nodes).toBe(harness.nodes);
    expect(disabled.edges).toBe(harness.edges);
    expect(disabled.boundary).toBe(harness.boundary);

    const reenabled = updateRunConfig(disabled, {
      field: "gateEnabled",
      gateId: "gate",
      enabled: true,
    });
    expect(reenabled.runConfig.gates).toEqual({});
    expect(isGateEnabled(reenabled.runConfig, "gate")).toBe(true);
    expect(reenabled.nodes).toBe(harness.nodes);
    expect(
      updateRunConfig(disabled, {
        field: "gateEnabled",
        gateId: "gate",
        enabled: false,
      }),
    ).toBe(disabled);
  });

  it("rejects gateEnabled for non-gate node ids", () => {
    const harness = createBranchingSeedHarness();
    expect(
      updateRunConfig(harness, {
        field: "gateEnabled",
        gateId: "worker",
        enabled: false,
      }),
    ).toBe(harness);
    expect(
      updateRunConfig(harness, {
        field: "gateEnabled",
        gateId: "missing",
        enabled: false,
      }),
    ).toBe(harness);
  });
});
