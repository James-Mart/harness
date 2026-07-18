import { instantiateFromCatalog } from "@/model/instantiate";
import {
  CURRENT_ITEM_PORT_ID,
  EMPTY_RUN_CONFIG,
  type Harness,
} from "@/model/types";

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
    boundary: [],
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
