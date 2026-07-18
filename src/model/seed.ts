import { instantiateFromCatalog } from "@/model/instantiate";
import { mockSchema } from "@/model/schema";
import {
  CURRENT_ITEM_PORT_ID,
  EMPTY_RUN_CONFIG,
  type Harness,
  type Port,
} from "@/model/types";

/** Typed outer signature for the base seed (harness-as-node). */
function baseSeedBoundary(): Port[] {
  return [
    {
      id: "tasks",
      name: "tasks",
      direction: "in",
      schema: mockSchema("taskList"),
      required: true,
    },
    {
      id: "summary",
      name: "summary",
      direction: "out",
      schema: mockSchema("string"),
    },
  ];
}

/**
 * Minimal base harness: list source → snapshot ForEach → implementor,
 * with data + exec edges and a container `$currentItem`.
 */
export function createBaseSeedHarness(): Harness {
  const source = instantiateFromCatalog("listSource", { id: "source" });
  const loop = instantiateFromCatalog("foreach", { id: "loop" });
  const worker = instantiateFromCatalog("implementor", {
    id: "worker",
    parentId: loop.id,
  });

  return {
    id: "base-seed",
    title: "Base seed harness",
    boundary: baseSeedBoundary(),
    nodes: [source, loop, worker],
    edges: [
      {
        kind: "data",
        from: { node: source.id, port: "items" },
        to: { node: loop.id, port: loop.iterablePortId },
      },
      {
        kind: "data",
        from: { node: loop.id, port: CURRENT_ITEM_PORT_ID },
        to: { node: worker.id, port: "task" },
      },
      { kind: "exec", from: source.id, to: loop.id },
      { kind: "exec", from: loop.id, to: worker.id },
    ],
    runConfig: structuredClone(EMPTY_RUN_CONFIG),
  };
}

/**
 * Base seed plus a gate with ok/deny exec branches (and validators).
 * Used by exec-edge tests — not the default editor seed.
 */
export function createBranchingSeedHarness(): Harness {
  const base = createBaseSeedHarness();
  const gate = instantiateFromCatalog("gate", {
    id: "gate",
    parentId: "loop",
  });
  const onOk = instantiateFromCatalog("validator", {
    id: "onOk",
    parentId: "loop",
  });
  const onDeny = instantiateFromCatalog("validator", {
    id: "onDeny",
    parentId: "loop",
  });

  return {
    ...base,
    id: "branching-seed",
    title: "Branching seed harness",
    nodes: [...base.nodes, gate, onOk, onDeny],
    edges: [
      ...base.edges,
      {
        kind: "data",
        from: { node: "worker", port: "result" },
        to: { node: gate.id, port: "prompt" },
      },
      {
        kind: "data",
        from: { node: "loop", port: CURRENT_ITEM_PORT_ID },
        to: { node: onOk.id, port: "task" },
      },
      {
        kind: "data",
        from: { node: "loop", port: CURRENT_ITEM_PORT_ID },
        to: { node: onDeny.id, port: "task" },
      },
      { kind: "exec", from: "worker", to: gate.id },
      { kind: "exec", from: gate.id, to: onOk.id, branch: "ok" },
      { kind: "exec", from: gate.id, to: onDeny.id, branch: "deny" },
    ],
  };
}
