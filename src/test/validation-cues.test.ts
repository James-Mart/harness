import { describe, expect, it } from "vitest";

import {
  advisoryCuesForNode,
  createBaseSeedHarness,
  createWiringCueDemoHarness,
  multiWireInputs,
  unwiredRequiredInputs,
  wiringAdvisoryCues,
  type Harness,
} from "@/model";

describe("wiring advisory cue detection", () => {
  it("flags unwired required inputs and multi-wire inputs", () => {
    const demo = createWiringCueDemoHarness();

    expect(unwiredRequiredInputs(demo)).toEqual([
      { node: "unwired", port: "task" },
    ]);
    expect(multiWireInputs(demo)).toEqual([
      { node: "multiWire", port: "items" },
    ]);
    expect(wiringAdvisoryCues(demo).get("unwired")).toEqual([
      "unwired-required",
    ]);
    expect(wiringAdvisoryCues(demo).get("multiWire")).toEqual([
      "multi-wire-input",
    ]);
    expect(advisoryCuesForNode(demo, "unwired")).toEqual(["unwired-required"]);
    expect(advisoryCuesForNode(demo, "multiWire")).toEqual([
      "multi-wire-input",
    ]);
    expect(advisoryCuesForNode(demo, "sourceA")).toEqual([]);
  });

  it("reports no wiring cues on a fully wired base seed", () => {
    const seed = createBaseSeedHarness();
    expect(unwiredRequiredInputs(seed)).toEqual([]);
    expect(multiWireInputs(seed)).toEqual([]);
    expect(wiringAdvisoryCues(seed).size).toBe(0);
  });

  it("does not flag optional unwired inputs", () => {
    const base = createBaseSeedHarness();
    const withOptional: Harness = {
      ...base,
      nodes: base.nodes.map((node) =>
        node.id !== "worker"
          ? node
          : {
              ...node,
              ports: [
                ...node.ports,
                {
                  id: "hint",
                  name: "hint",
                  direction: "in",
                  schema: { type: "string" },
                },
              ],
            },
      ),
    };

    expect(unwiredRequiredInputs(withOptional)).toEqual([]);
    expect(advisoryCuesForNode(withOptional, "worker")).toEqual([]);
  });

  it("ignores multi-wire hits on missing or non-input ports", () => {
    const base = createBaseSeedHarness();
    const phantom: Harness = {
      ...base,
      edges: [
        ...base.edges,
        {
          kind: "data",
          from: { node: "source", port: "items" },
          to: { node: "worker", port: "result" },
        },
        {
          kind: "data",
          from: { node: "loop", port: "$currentItem" },
          to: { node: "worker", port: "result" },
        },
        {
          kind: "data",
          from: { node: "source", port: "items" },
          to: { node: "worker", port: "nope" },
        },
        {
          kind: "data",
          from: { node: "loop", port: "$currentItem" },
          to: { node: "worker", port: "nope" },
        },
      ],
    };

    expect(multiWireInputs(phantom)).toEqual([]);
    expect(advisoryCuesForNode(phantom, "worker")).toEqual([]);
  });
});
