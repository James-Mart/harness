import { describe, expect, it } from "vitest";

import {
  CURRENT_ITEM_PORT_ID,
  canConnectDataWire,
  connectDataWire,
  createBaseSeedHarness,
  instantiateFromCatalog,
  mockSchema,
  schemaCompatKey,
  schemasCompatible,
  type Harness,
} from "@/model";

describe("schema type compatibility", () => {
  it("matches equal keys and treats either-side any as compatible", () => {
    expect(schemaCompatKey(mockSchema("task"))).toBe("Task");
    expect(schemaCompatKey(mockSchema("string"))).toBe("string");
    expect(schemaCompatKey(mockSchema("any"))).toBe("any");

    expect(schemasCompatible(mockSchema("task"), mockSchema("task"))).toBe(
      true,
    );
    expect(schemasCompatible(mockSchema("string"), mockSchema("boolean"))).toBe(
      false,
    );
    expect(schemasCompatible(mockSchema("any"), mockSchema("boolean"))).toBe(
      true,
    );
    expect(schemasCompatible(mockSchema("task"), mockSchema("any"))).toBe(true);
  });
});

describe("connectDataWire", () => {
  it("rejects type-incompatible data wires", () => {
    const harness = createBaseSeedHarness();
    const gate = instantiateFromCatalog("gate", { id: "gate" });
    const withGate: Harness = {
      ...harness,
      nodes: [...harness.nodes, gate],
    };

    // implementor.result (string) → loop.items (Task[]) — incompatible
    expect(
      canConnectDataWire(
        withGate,
        { node: "worker", port: "result" },
        { node: "loop", port: "items" },
      ),
    ).toBe(false);
    expect(
      connectDataWire(
        withGate,
        { node: "worker", port: "result" },
        { node: "loop", port: "items" },
      ),
    ).toBeNull();

    // source.items (Task[]) → gate.prompt (string) — incompatible
    expect(
      connectDataWire(
        withGate,
        { node: "source", port: "items" },
        { node: "gate", port: "prompt" },
      ),
    ).toBeNull();
  });

  it("replaces an existing wire into the same input (one-wire-per-input)", () => {
    const harness = createBaseSeedHarness();
    const secondSource = instantiateFromCatalog("listSource", {
      id: "source-b",
    });
    const withSecond: Harness = {
      ...harness,
      nodes: [...harness.nodes, secondSource],
    };

    const target = { node: "loop", port: "items" };
    const next = connectDataWire(
      withSecond,
      { node: "source-b", port: "items" },
      target,
    );
    expect(next).not.toBeNull();

    const intoLoop = next!.edges.filter(
      (edge) =>
        edge.kind === "data" &&
        edge.to.node === target.node &&
        edge.to.port === target.port,
    );
    expect(intoLoop).toHaveLength(1);
    expect(intoLoop[0]).toEqual({
      kind: "data",
      from: { node: "source-b", port: "items" },
      to: target,
    });

    expect(
      next!.edges.some(
        (edge) =>
          edge.kind === "data" &&
          edge.from.node === "source" &&
          edge.to.node === "loop",
      ),
    ).toBe(false);
    expect(
      next!.edges.some(
        (edge) =>
          edge.kind === "data" &&
          edge.from.port === CURRENT_ITEM_PORT_ID &&
          edge.to.node === "worker",
      ),
    ).toBe(true);
  });
});
