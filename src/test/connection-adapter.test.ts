import { describe, expect, it } from "vitest";

import { connectionEndpoints } from "@/components/canvas/connectionAdapter";
import {
  bodyHelperNodeId,
  modelNodeIdFromFlowNodeId,
  parseBodyHelperNodeId,
} from "@/components/canvas/harnessToFlow";
import { CURRENT_ITEM_PORT_ID } from "@/model";

describe("connectionEndpoints", () => {
  it("maps a complete RF connection to port refs", () => {
    expect(
      connectionEndpoints({
        source: "source",
        sourceHandle: "items",
        target: "loop",
        targetHandle: "items",
      }),
    ).toEqual({
      from: { node: "source", port: "items" },
      to: { node: "loop", port: "items" },
    });
  });

  it("maps Variables helper endpoints back to the body node", () => {
    expect(
      parseBodyHelperNodeId(bodyHelperNodeId("loop", "variables")),
    ).toEqual({ bodyId: "loop", kind: "variables" });
    expect(
      modelNodeIdFromFlowNodeId(bodyHelperNodeId("loop", "variables")),
    ).toBe("loop");
    expect(
      connectionEndpoints({
        source: bodyHelperNodeId("loop", "variables"),
        sourceHandle: CURRENT_ITEM_PORT_ID,
        target: "worker",
        targetHandle: "task",
      }),
    ).toEqual({
      from: { node: "loop", port: CURRENT_ITEM_PORT_ID },
      to: { node: "worker", port: "task" },
    });
    // Pass-through input ids round-trip the same way as `$currentItem`.
    expect(
      connectionEndpoints({
        source: bodyHelperNodeId("loop", "variables"),
        sourceHandle: "context",
        target: "gate",
        targetHandle: "prompt",
      }),
    ).toEqual({
      from: { node: "loop", port: "context" },
      to: { node: "gate", port: "prompt" },
    });
  });

  it("returns null when any endpoint is missing", () => {
    expect(
      connectionEndpoints({
        source: "source",
        sourceHandle: "items",
        target: "loop",
        targetHandle: null,
      }),
    ).toBeNull();
    expect(
      connectionEndpoints({
        source: null,
        sourceHandle: "items",
        target: "loop",
        targetHandle: "items",
      }),
    ).toBeNull();
  });
});
