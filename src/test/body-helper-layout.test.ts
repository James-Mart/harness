import { describe, expect, it } from "vitest";

import { numericStyle } from "@/authoring/flowGeometry";
import { assertLayoutInvariants } from "@/authoring/layoutInvariants";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import {
  bodyHelperNodeId,
  harnessToFlowNodes,
  toHelperFlowNode,
} from "@/components/canvas/harnessToFlow";
import {
  FLOW_LAYOUT,
  bodyBottomStripOrigin,
  bodyChildrenOriginY,
  bodyHelperStripsHeight,
  bodyTopStripOrigin,
  containerChromeHeaderHeight,
} from "@/components/canvas/layoutTokens";
import {
  createBaseSeedHarness,
  createBranchingSeedHarness,
  createEunomioSeedHarness,
  createTrackerSeedHarness,
  createWorkPoolSeedHarness,
} from "@/model";

const SEED_HARNESSES = [
  createBaseSeedHarness,
  createBranchingSeedHarness,
  createWorkPoolSeedHarness,
  createTrackerSeedHarness,
  createEunomioSeedHarness,
] as const;

describe("body helper layout strips", () => {
  it("keeps bodyTopStripHeight tied to helperNodeHeight", () => {
    expect(FLOW_LAYOUT.bodyTopStripHeight).toBe(FLOW_LAYOUT.helperNodeHeight);
  });

  it("grows container height by the top-strip reservation", () => {
    const nodes = harnessToFlowNodes(createBaseSeedHarness());
    const loop = nodes.find((node) => node.id === "loop");
    const worker = nodes.find((node) => node.id === "worker");
    if (!loop || !worker) throw new Error("expected loop/worker");

    const header = containerChromeHeaderHeight();
    const workerHeight = numericStyle(worker.style?.height) ?? 0;
    const expectedHeight =
      header +
      FLOW_LAYOUT.containerPadY * 2 +
      bodyHelperStripsHeight() +
      workerHeight;

    expect(numericStyle(loop.style?.height)).toBe(expectedHeight);
  });

  it("exposes reusable top/bottom strip origins for helper placement", () => {
    const header = containerChromeHeaderHeight();
    const childHeight = 80;
    expect(bodyTopStripOrigin(header)).toEqual({
      x: FLOW_LAYOUT.containerPadX,
      y: header + FLOW_LAYOUT.containerPadY,
    });
    expect(
      bodyBottomStripOrigin(
        header,
        childHeight,
        FLOW_LAYOUT.bodyTopStripHeight,
        FLOW_LAYOUT.helperNodeHeight,
      ),
    ).toEqual({
      x: FLOW_LAYOUT.containerPadX,
      y:
        bodyChildrenOriginY(header, FLOW_LAYOUT.bodyTopStripHeight) +
        childHeight +
        FLOW_LAYOUT.childGap,
    });
  });

  it("builds non-interactive synthetic helper nodes", () => {
    const helper = toHelperFlowNode({
      bodyId: "loop",
      kind: "exec",
      title: "Exec",
      position: bodyTopStripOrigin(containerChromeHeaderHeight()),
    });
    expect(helper.id).toBe(bodyHelperNodeId("loop", "exec"));
    expect(helper.type).toBe("helper");
    expect(helper.parentId).toBe("loop");
    expect(helper.draggable).toBe(false);
    expect(helper.deletable).toBe(false);
    expect(helper.selectable).toBe(false);
    expect(helper.data).toEqual({ kind: "exec", title: "Exec", ports: [] });
  });

  it("holds layout invariants when a top-strip helper is placed in the body", () => {
    const nodes = harnessToFlowNodes(createBaseSeedHarness());
    const header = containerChromeHeaderHeight();
    const withHelper = [
      ...nodes,
      toHelperFlowNode({
        bodyId: "loop",
        kind: "exec",
        title: "Exec",
        position: bodyTopStripOrigin(header),
      }),
    ];
    assertLayoutInvariants(withHelper);

    const helper = withHelper.find(
      (node) => node.id === bodyHelperNodeId("loop", "exec"),
    );
    const worker = withHelper.find((node) => node.id === "worker");
    expect(helper).toBeDefined();
    expect(worker).toBeDefined();
    expect(worker!.position.y).toBeGreaterThanOrEqual(
      helper!.position.y + FLOW_LAYOUT.helperNodeHeight,
    );
  });

  it.each(SEED_HARNESSES.map((create) => [create.name, create] as const))(
    "keeps %s layout invariants with a canvas-level top-strip helper",
    (_name, create) => {
      const nodes = harnessToFlowNodes(create());
      assertLayoutInvariants([
        ...nodes,
        toHelperFlowNode({
          bodyId: HARNESS_FLOW_NODE_ID,
          kind: "exec",
          title: "Exec",
          position: bodyTopStripOrigin(FLOW_LAYOUT.harnessHeaderHeight),
        }),
      ]);
    },
  );
});
