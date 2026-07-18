import { describe, expect, it } from "vitest";

import { connectionEndpoints } from "@/components/canvas/connectionAdapter";

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
