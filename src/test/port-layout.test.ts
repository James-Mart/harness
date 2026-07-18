import { describe, expect, it } from "vitest";

import {
  FLOW_LAYOUT,
  containerExecOutHandleTops,
  containerHeaderPortHandleTops,
  execBandHeight,
  execOutHandleTops,
  leafHeightForPortCount,
  leafPortHandleTops,
  portHandleTopsInBand,
} from "@/components/canvas/layoutTokens";
import {
  portsByDirection,
  schemaAccent,
  schemaAccentFamily,
} from "@/components/canvas/portVisuals";
import { mockSchema, schemaCompatKey } from "@/model";

describe("port layout helpers", () => {
  it("derives display keys from title, accents from structural type", () => {
    expect(schemaCompatKey(mockSchema("string"))).toBe("string");
    expect(schemaCompatKey(mockSchema("task"))).toBe("Task");
    expect(schemaCompatKey(mockSchema("taskList"))).toBe("Task[]");
    expect(schemaAccentFamily(mockSchema("task"))).toBe("object");
    expect(schemaAccentFamily(mockSchema("taskList"))).toBe("array");
    expect(schemaAccentFamily(mockSchema("gateDecision"))).toBe("enum");
    expect(schemaCompatKey(mockSchema("any"))).toBe("any");
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
      const execOuts = 1;
      const height = leafHeightForPortCount(rows, execOuts);
      const tops = leafPortHandleTops(rows, execOuts);
      const dataTop = FLOW_LAYOUT.leafHeaderHeight + execBandHeight(execOuts);

      expect(height).toBe(
        Math.max(
          FLOW_LAYOUT.leafMinHeight,
          FLOW_LAYOUT.leafHeaderHeight +
            execBandHeight(execOuts) +
            rows * FLOW_LAYOUT.portRowHeight +
            FLOW_LAYOUT.leafPadY,
        ),
      );
      expect(tops).toHaveLength(rows);

      for (const [index, top] of tops.entries()) {
        expect(top).toBe(dataTop + (index + 0.5) * FLOW_LAYOUT.portRowHeight);
        expect(top).toBeGreaterThan(dataTop);
        expect(top).toBeLessThan(height - FLOW_LAYOUT.leafPadY);
      }
    }
  });

  it("places exec-out tops below the leaf title header and grows height", () => {
    const execOuts = 2;
    const tops = execOutHandleTops(execOuts);
    expect(tops).toHaveLength(execOuts);
    for (const top of tops) {
      expect(top).toBeGreaterThan(FLOW_LAYOUT.leafHeaderHeight);
      expect(top).toBeLessThan(
        FLOW_LAYOUT.leafHeaderHeight + execBandHeight(execOuts),
      );
    }

    const withBranches = leafHeightForPortCount(1, execOuts);
    const sequential = leafHeightForPortCount(1, 1);
    expect(withBranches).toBeGreaterThan(sequential);
    expect(withBranches).toBe(
      FLOW_LAYOUT.leafHeaderHeight +
        execBandHeight(execOuts) +
        FLOW_LAYOUT.portRowHeight +
        FLOW_LAYOUT.leafPadY,
    );
  });

  it("keeps container handle tops inside the header band below exec", () => {
    for (const count of [1, 2, 3]) {
      const execOuts = 1;
      const execTops = containerExecOutHandleTops(execOuts);
      const tops = containerHeaderPortHandleTops(count, execOuts);
      expect(tops).toHaveLength(count);
      expect(execTops[0]).toBeLessThan(tops[0]!);
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

  it("uses the full header band when execOutCount is 0", () => {
    for (const count of [1, 2]) {
      const tops = containerHeaderPortHandleTops(count, 0);
      expect(tops).toHaveLength(count);
      for (const top of tops) {
        expect(top).toBeGreaterThan(0);
        expect(top).toBeLessThan(FLOW_LAYOUT.containerHeaderHeight);
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
