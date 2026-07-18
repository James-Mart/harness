import { describe, expect, it } from "vitest";

import {
  EXEC_IN_HANDLE,
  EXEC_OUT_HANDLE,
  branchValuesFromNode,
  branchValuesFromPorts,
  createBaseSeedHarness,
  createBranchingSeedHarness,
  execEdgeId,
  execOutBranchesForNode,
  execOutHandleId,
  instantiateFromCatalog,
  selectExecPath,
  type Harness,
  type LeafNode,
} from "@/model";

describe("selectExecPath", () => {
  it("selects the matching exec branch from a node's typed output", () => {
    const harness = createBranchingSeedHarness();

    expect(selectExecPath(harness, "gate", "ok")).toBe("onOk");
    expect(selectExecPath(harness, "gate", "deny")).toBe("onDeny");
  });

  it("follows unbranched exec order when no branch value is supplied", () => {
    const harness = createBranchingSeedHarness();

    expect(selectExecPath(harness, "source", undefined)).toBe("loop");
    expect(selectExecPath(harness, "worker", null)).toBe("gate");
    expect(selectExecPath(harness, "gate", undefined)).toBeNull();
  });

  it("fail-closes when a branch value is supplied but matches no edge", () => {
    const harness: Harness = {
      ...createBaseSeedHarness(),
      edges: [
        ...createBaseSeedHarness().edges,
        { kind: "exec", from: "worker", to: "loop" },
        {
          kind: "exec",
          from: "worker",
          to: "source",
          branch: "ok",
        },
      ],
    };

    expect(selectExecPath(harness, "worker", "ok")).toBe("source");
    expect(selectExecPath(harness, "worker", "typo")).toBeNull();
    expect(selectExecPath(harness, "worker", undefined)).toBe("loop");
  });

  it("works for any enum-typed output, not only gates (split/indivisible)", () => {
    const planner: LeafNode = {
      kind: "leaf",
      id: "planner",
      type: "planner",
      title: "Planner",
      ports: [
        {
          id: "decision",
          name: "decision",
          direction: "out",
          schema: { type: "string", enum: ["split", "indivisible"] },
        },
      ],
    };
    const continueNode = instantiateFromCatalog("implementor", {
      id: "continue",
    });
    const leaf = instantiateFromCatalog("validator", { id: "leaf" });

    const harness: Harness = {
      id: "branch-demo",
      title: "Branch demo",
      boundary: [],
      nodes: [planner, continueNode, leaf],
      edges: [
        {
          kind: "exec",
          from: planner.id,
          to: continueNode.id,
          branch: "split",
        },
        {
          kind: "exec",
          from: planner.id,
          to: leaf.id,
          branch: "indivisible",
        },
      ],
      runConfig: { perContainer: {}, gates: {} },
    };

    expect(branchValuesFromNode(planner)).toEqual(["split", "indivisible"]);
    expect(selectExecPath(harness, "planner", "split")).toBe("continue");
    expect(selectExecPath(harness, "planner", "indivisible")).toBe("leaf");
  });
});

describe("execOutBranchesForNode", () => {
  it("derives outs from wired exec edges (not solely from port enums)", () => {
    const harness = createBranchingSeedHarness();
    const gate = harness.nodes.find((node) => node.id === "gate")!;
    expect(execOutBranchesForNode(harness, gate)).toEqual(["ok", "deny"]);

    const worker = harness.nodes.find((node) => node.id === "worker")!;
    expect(execOutBranchesForNode(harness, worker)).toEqual([undefined]);
  });

  it("dedupes overlapping enum labels from ports", () => {
    expect(
      branchValuesFromPorts([
        {
          id: "a",
          name: "a",
          direction: "out",
          schema: { type: "string", enum: ["ok", "deny"] },
        },
        {
          id: "b",
          name: "b",
          direction: "out",
          schema: { type: "string", enum: ["ok", "other"] },
        },
      ]),
    ).toEqual(["ok", "deny", "other"]);
  });
});

describe("exec handle ids", () => {
  it("builds stable unbranched and branch handle ids", () => {
    expect(EXEC_IN_HANDLE).toBe("$exec");
    expect(EXEC_OUT_HANDLE).toBe("$exec-out");
    expect(execOutHandleId()).toBe("$exec-out");
    expect(execOutHandleId("ok")).toBe("$exec-out:ok");
    expect(execEdgeId("gate", "onOk", "ok")).toBe("exec:gate->onOk:ok");
    expect(execEdgeId("source", "loop")).toBe("exec:source->loop");
  });
});
