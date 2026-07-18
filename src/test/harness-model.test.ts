import { describe, expect, it } from "vitest";

import {
  CURRENT_ITEM_PORT_ID,
  MOCK_CATALOG,
  MOCK_SCHEMAS,
  createBaseSeedHarness,
  getCurrentItemPort,
  instantiateFromCatalog,
  itemSchemaOf,
  mockSchema,
} from "@/model";

describe("harness model", () => {
  it("constructs the base seed from the mock catalog and schema", () => {
    const harness = createBaseSeedHarness();

    expect(harness.nodes).toHaveLength(3);
    expect(harness.edges.filter((edge) => edge.kind === "data")).toHaveLength(
      2,
    );
    expect(harness.edges.filter((edge) => edge.kind === "exec")).toHaveLength(
      2,
    );
    expect(harness.boundary).toEqual([]);
    expect(harness.runConfig).toEqual({ perContainer: {}, gates: {} });

    const source = harness.nodes.find((node) => node.id === "source");
    const loop = harness.nodes.find((node) => node.id === "loop");
    const worker = harness.nodes.find((node) => node.id === "worker");

    expect(source?.kind).toBe("leaf");
    expect(source?.type).toBe("listSource");
    expect(loop?.kind).toBe("container");
    expect(worker?.kind).toBe("leaf");
    expect(worker?.parentId).toBe("loop");

    if (loop?.kind !== "container") {
      throw new Error("expected foreach container");
    }

    expect(loop.source).toEqual({ kind: "snapshot" });
    expect(loop.concurrency).toEqual({ kind: "sequential" });

    const iterable = loop.ports.find((port) => port.id === loop.iterablePortId);
    expect(iterable?.iterable).toBe(true);
    expect(iterable?.direction).toBe("in");
    expect(iterable?.schema).toEqual(mockSchema("taskList"));

    const currentItem = getCurrentItemPort(loop);
    expect(currentItem.id).toBe(CURRENT_ITEM_PORT_ID);
    expect(currentItem.direction).toBe("out");
    expect(currentItem.schema).toEqual(itemSchemaOf(mockSchema("taskList")));
    expect(currentItem.schema).toEqual(MOCK_SCHEMAS.task);

    const itemsWire = harness.edges.find(
      (edge) =>
        edge.kind === "data" &&
        edge.from.node === "source" &&
        edge.from.port === "items" &&
        edge.to.node === "loop" &&
        edge.to.port === loop.iterablePortId,
    );
    expect(itemsWire).toBeDefined();

    const currentItemWire = harness.edges.find(
      (edge) =>
        edge.kind === "data" &&
        edge.from.node === "loop" &&
        edge.from.port === CURRENT_ITEM_PORT_ID &&
        edge.to.node === "worker" &&
        edge.to.port === "task",
    );
    expect(currentItemWire).toBeDefined();
  });

  it("instantiates every catalog entry with typed ports", () => {
    for (const entry of MOCK_CATALOG) {
      const node = instantiateFromCatalog(entry.type, {
        id: `n-${entry.type}`,
      });
      expect(node.type).toBe(entry.type);
      expect(node.kind).toBe(entry.kind);
      expect(node.ports.length).toBeGreaterThan(0);

      for (const port of node.ports) {
        if (port.id === CURRENT_ITEM_PORT_ID) continue;
        expect(port.schema).toEqual(
          mockSchema(entry.ports.find((def) => def.id === port.id)!.schema),
        );
      }

      if (node.kind === "container") {
        expect(node.ports.some((port) => port.iterable)).toBe(true);
        expect(getCurrentItemPort(node).id).toBe(CURRENT_ITEM_PORT_ID);
      }
    }
  });

  it("marks gate catalog entries with isGate", () => {
    const gate = instantiateFromCatalog("gate", { id: "gate-1" });
    expect(gate.kind).toBe("leaf");
    if (gate.kind === "leaf") {
      expect(gate.isGate).toBe(true);
    }
  });
});
