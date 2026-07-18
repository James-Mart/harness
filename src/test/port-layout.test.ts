import { describe, expect, it } from "vitest";

import {
  FLOW_LAYOUT,
  containerHeaderPortHandleTops,
  leafHeightForPortCount,
  leafPortHandleTops,
  portHandleTopsInBand,
} from "@/components/canvas/layoutTokens";
import {
  portsByDirection,
  schemaAccent,
  schemaAccentFamily,
  schemaTypeKey,
} from "@/components/canvas/portVisuals";
import { mockSchema } from "@/model";

describe("port layout helpers", () => {
  it("derives display keys from title, accents from structural type", () => {
    expect(schemaTypeKey(mockSchema("string"))).toBe("string");
    expect(schemaTypeKey(mockSchema("task"))).toBe("Task");
    expect(schemaTypeKey(mockSchema("taskList"))).toBe("Task[]");
    expect(schemaAccentFamily(mockSchema("task"))).toBe("object");
    expect(schemaAccentFamily(mockSchema("taskList"))).toBe("array");
    expect(schemaAccentFamily(mockSchema("gateDecision"))).toBe("enum");
    expect(schemaTypeKey(mockSchema("any"))).toBe("any");
  });

  it("maps structural schema families to accent tokens", () => {
    expect(schemaAccent(mockSchema("string"))).toBe("var(--chart-2)");
    expect(schemaAccent(mockSchema("boolean"))).toBe("var(--chart-3)");
    expect(schemaAccent(mockSchema("task"))).toBe("var(--chart-4)");
    expect(schemaAccent(mockSchema("taskList"))).toBe("var(--chart-1)");
    expect(schemaAccent(mockSchema("gateDecision"))).toBe("var(--chart-5)");
    expect(schemaAccent(mockSchema("any"))).toBe("var(--muted-foreground)");
    // Untitled object/array still colour by type, not title special-cases.
    expect(schemaAccent({ type: "object" })).toBe("var(--chart-4)");
    expect(schemaAccent({ type: "array" })).toBe("var(--chart-1)");
  });

  it("spaces handle tops in a pixel band", () => {
    expect(portHandleTopsInBand(0, 0, 40)).toEqual([]);
    expect(portHandleTopsInBand(1, 10, 40)).toEqual([30]);
    expect(portHandleTopsInBand(2, 0, 40)).toEqual([10, 30]);
  });

  it("keeps leaf handle tops coupled to measured leaf height", () => {
    for (const rows of [1, 2, 3]) {
      const height = leafHeightForPortCount(rows);
      const tops = leafPortHandleTops(rows);

      expect(height).toBe(
        Math.max(
          FLOW_LAYOUT.leafMinHeight,
          FLOW_LAYOUT.leafHeaderHeight +
            rows * FLOW_LAYOUT.portRowHeight +
            FLOW_LAYOUT.leafPadY,
        ),
      );
      expect(tops).toHaveLength(rows);

      for (const [index, top] of tops.entries()) {
        expect(top).toBe(
          FLOW_LAYOUT.leafHeaderHeight +
            (index + 0.5) * FLOW_LAYOUT.portRowHeight,
        );
        expect(top).toBeGreaterThan(FLOW_LAYOUT.leafHeaderHeight);
        expect(top).toBeLessThan(height - FLOW_LAYOUT.leafPadY);
      }
    }
  });

  it("keeps container handle tops inside the header band", () => {
    for (const count of [1, 2, 3]) {
      const tops = containerHeaderPortHandleTops(count);
      expect(tops).toHaveLength(count);
      for (const top of tops) {
        expect(top).toBeGreaterThan(0);
        expect(top).toBeLessThan(FLOW_LAYOUT.containerHeaderHeight);
        expect(top).toBeGreaterThanOrEqual(FLOW_LAYOUT.containerHeaderPortPadY);
        expect(top).toBeLessThanOrEqual(
          FLOW_LAYOUT.containerHeaderHeight -
            FLOW_LAYOUT.containerHeaderPortPadY,
        );
      }
    }
  });

  it("splits ports by direction", () => {
    const { inputs, outputs } = portsByDirection([
      {
        id: "a",
        name: "a",
        direction: "in",
        schema: mockSchema("string"),
      },
      {
        id: "b",
        name: "b",
        direction: "out",
        schema: mockSchema("boolean"),
      },
      {
        id: "c",
        name: "c",
        direction: "in",
        schema: mockSchema("task"),
      },
    ]);
    expect(inputs.map((port) => port.id)).toEqual(["a", "c"]);
    expect(outputs.map((port) => port.id)).toEqual(["b"]);
  });
});
