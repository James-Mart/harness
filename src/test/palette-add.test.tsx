import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  CATALOG_DRAG_MIME,
  readCatalogDragType,
  setCatalogDragData,
} from "@/authoring/catalogDrag";
import App from "@/App";
import { HARNESS_FLOW_NODE_ID } from "@/components/canvas/flowIds";
import { harnessToFlowNodes } from "@/components/canvas/harnessToFlow";
import { FLOW_LAYOUT } from "@/components/canvas/layoutTokens";
import {
  addCatalogNode,
  createBaseSeedHarness,
  instantiateFromCatalog,
  MOCK_CATALOG,
} from "@/model";

describe("addCatalogNode", () => {
  it("appends a top-level leaf from the catalog", () => {
    const harness = createBaseSeedHarness();
    const next = addCatalogNode(harness, "gate");
    const added = next.nodes.find((node) => node.id === "gate-1");

    expect(next.nodes).toHaveLength(harness.nodes.length + 1);
    expect(added).toMatchObject({
      kind: "leaf",
      type: "gate",
      title: "Gate",
      isGate: true,
    });
    expect(added?.parentId).toBeUndefined();
  });

  it("appends a top-level container from the catalog", () => {
    const harness = createBaseSeedHarness();
    const next = addCatalogNode(harness, "workPool");
    const added = next.nodes.find((node) => node.id === "workPool-1");

    expect(added).toMatchObject({
      kind: "container",
      type: "workPool",
      title: "Work pool",
      source: { kind: "live" },
      end: { kind: "fixpoint" },
    });
    expect(added?.parentId).toBeUndefined();
  });

  it("allocates distinct ids when the same type is added twice", () => {
    const harness = createBaseSeedHarness();
    const once = addCatalogNode(harness, "validator");
    const twice = addCatalogNode(once, "validator");

    expect(twice.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(["validator-1", "validator-2"]),
    );
  });

  it("covers every mock catalog type", () => {
    let harness = createBaseSeedHarness();
    for (const entry of MOCK_CATALOG) {
      harness = addCatalogNode(harness, entry.type);
      const added = harness.nodes.at(-1);
      expect(added?.type).toBe(entry.type);
      expect(added?.kind).toBe(entry.kind);
      expect(added?.parentId).toBeUndefined();
    }
  });
});

describe("viewport-centre placement", () => {
  it("persists a placement position when one is supplied", () => {
    const harness = createBaseSeedHarness();
    const next = addCatalogNode(harness, "gate", {
      position: { x: 120, y: 80 },
    });
    const added = next.nodes.find((node) => node.id === "gate-1");
    expect(added?.position).toEqual({ x: 120, y: 80 });
  });

  it("places a positioned root at its persisted position", () => {
    const harness = addCatalogNode(createBaseSeedHarness(), "gate", {
      position: { x: 500, y: 320 },
    });
    const gate = harnessToFlowNodes(harness).find(
      (node) => node.id === "gate-1",
    );
    expect(gate?.parentId).toBe(HARNESS_FLOW_NODE_ID);
    expect(gate?.position).toEqual({ x: 500, y: 320 });
  });

  it("keeps the harness shell large enough to contain a placed root", () => {
    const harness = addCatalogNode(createBaseSeedHarness(), "gate", {
      position: { x: 900, y: 600 },
    });
    const nodes = harnessToFlowNodes(harness);
    const shell = nodes.find((node) => node.id === HARNESS_FLOW_NODE_ID);
    expect(shell?.style?.width).toBeGreaterThan(900);
    expect(shell?.style?.height).toBeGreaterThan(600);
  });

  it("still auto-layouts roots added without a position", () => {
    const harness = addCatalogNode(createBaseSeedHarness(), "gate");
    const gate = harnessToFlowNodes(harness).find(
      (node) => node.id === "gate-1",
    );
    expect(gate?.position.y).toBe(
      FLOW_LAYOUT.harnessHeaderHeight + FLOW_LAYOUT.containerPadY,
    );
  });

  it("auto-layouts around a manually placed root without colliding slots", () => {
    // Place gate between auto roots in harness order: source, gate, loop.
    let harness = createBaseSeedHarness();
    harness = {
      ...harness,
      nodes: [
        harness.nodes[0]!,
        {
          ...instantiateFromCatalog("gate", {
            id: "gate-1",
            position: { x: 50, y: 50 },
          }),
        },
        ...harness.nodes.slice(1),
      ],
    };
    const nodes = harnessToFlowNodes(harness);
    const source = nodes.find((node) => node.id === "source");
    const gate = nodes.find((node) => node.id === "gate-1");
    const loop = nodes.find((node) => node.id === "loop");
    expect(gate?.position).toEqual({ x: 50, y: 50 });
    // Auto roots still pack L→R from the shell pad — loop sits after source,
    // not after the intervening placed gate's width.
    expect(source?.position.x).toBe(FLOW_LAYOUT.containerPadX);
    expect(loop?.position.x).toBeGreaterThan(source!.position.x);
    expect(loop?.position.y).toBe(source?.position.y);
  });
});

describe("catalog drag payload", () => {
  it("round-trips known catalog types and rejects unknowns", () => {
    const transfer = new DataTransfer();
    setCatalogDragData(transfer, "gate");
    expect(transfer.getData(CATALOG_DRAG_MIME)).toBe("gate");
    expect(readCatalogDragType(transfer)).toBe("gate");

    transfer.clearData();
    transfer.setData(CATALOG_DRAG_MIME, "not-a-catalog-type");
    expect(readCatalogDragType(transfer)).toBeNull();
  });
});

describe("palette add UI", () => {
  afterEach(() => {
    cleanup();
  });

  it("places a catalog leaf on the canvas when a palette item is clicked", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("palette-item-gate"));

    const canvas = screen.getByTestId("editor-canvas");
    const gate = within(canvas).getByTestId("flow-node-gate-1");
    expect(gate).toHaveAttribute("data-kind", "leaf");
    expect(within(gate).getByText("Gate")).toBeInTheDocument();
  });

  it("places a catalog container on the canvas when a palette item is clicked", () => {
    render(<App />);

    fireEvent.click(screen.getByTestId("palette-item-workPool"));

    const canvas = screen.getByTestId("editor-canvas");
    const pool = within(canvas).getByTestId("flow-node-workPool-1");
    expect(pool).toHaveAttribute("data-kind", "container");
    expect(within(pool).getByText("Work pool")).toBeInTheDocument();
  });

  it("places a catalog node when a catalog type is dropped on the canvas", () => {
    render(<App />);

    const canvas = screen.getByTestId("editor-canvas");
    const transfer = new DataTransfer();
    setCatalogDragData(transfer, "fanOut");

    fireEvent.dragOver(canvas, { dataTransfer: transfer });
    fireEvent.drop(canvas, { dataTransfer: transfer });

    const fanOut = within(canvas).getByTestId("flow-node-fanOut-1");
    expect(fanOut).toHaveAttribute("data-kind", "leaf");
    expect(within(fanOut).getByText("Fan-out")).toBeInTheDocument();
  });
});
