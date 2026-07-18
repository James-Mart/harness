import type { MockSchemaName } from "@/model/schema";
import type { Concurrency, EndCondition, PortId, Source } from "@/model/types";

export type CatalogPortDef = {
  id: PortId;
  name: string;
  direction: "in" | "out";
  schema: MockSchemaName;
  required?: boolean;
  iterable?: boolean;
};

type CatalogEntryBase = {
  type: string;
  title: string;
  category: string;
  ports: readonly CatalogPortDef[];
};

export type LeafCatalogEntry = CatalogEntryBase & {
  kind: "leaf";
  isGate?: boolean;
};

export type ContainerCatalogEntry = CatalogEntryBase & {
  kind: "container";
  iterablePortId: PortId;
  defaultSource: Source;
  defaultConcurrency: Concurrency;
  /** Default end condition (fixpoint for live work-pools). */
  defaultEnd?: EndCondition;
};

export type CatalogEntry = LeafCatalogEntry | ContainerCatalogEntry;

/** Shared iterable input for foreach / workPool containers. */
const ITERABLE_TASK_LIST_PORTS = [
  {
    id: "items",
    name: "items",
    direction: "in",
    schema: "taskList",
    required: true,
    iterable: true,
  },
] as const satisfies readonly CatalogPortDef[];

export const MOCK_CATALOG = [
  {
    type: "listSource",
    kind: "leaf",
    title: "List source",
    category: "Sources",
    ports: [
      {
        id: "items",
        name: "items",
        direction: "out",
        schema: "taskList",
      },
    ],
  },
  {
    type: "foreach",
    kind: "container",
    title: "For each",
    category: "Containers",
    ports: ITERABLE_TASK_LIST_PORTS,
    iterablePortId: "items",
    defaultSource: { kind: "snapshot" },
    defaultConcurrency: { kind: "sequential" },
  },
  {
    type: "workPool",
    kind: "container",
    title: "Work pool",
    category: "Containers",
    ports: ITERABLE_TASK_LIST_PORTS,
    iterablePortId: "items",
    defaultSource: { kind: "live" },
    defaultConcurrency: { kind: "parallel", maxConcurrency: 4 },
    defaultEnd: { kind: "fixpoint" },
  },
  {
    type: "gate",
    kind: "leaf",
    title: "Gate",
    category: "Control",
    isGate: true,
    ports: [
      {
        id: "prompt",
        name: "prompt",
        direction: "in",
        schema: "string",
        required: true,
      },
      {
        id: "decision",
        name: "decision",
        direction: "out",
        schema: "gateDecision",
      },
    ],
  },
  {
    type: "fanOut",
    kind: "leaf",
    title: "Fan-out",
    category: "Agents",
    ports: [
      {
        id: "task",
        name: "task",
        direction: "in",
        schema: "task",
        required: true,
      },
    ],
  },
  {
    type: "implementor",
    kind: "leaf",
    title: "Implementor",
    category: "Agents",
    ports: [
      {
        id: "task",
        name: "task",
        direction: "in",
        schema: "task",
        required: true,
      },
      {
        id: "result",
        name: "result",
        direction: "out",
        schema: "string",
      },
    ],
  },
  {
    type: "validator",
    kind: "leaf",
    title: "Validator",
    category: "Agents",
    ports: [
      {
        id: "task",
        name: "task",
        direction: "in",
        schema: "task",
        required: true,
      },
      {
        id: "ok",
        name: "ok",
        direction: "out",
        schema: "boolean",
      },
    ],
  },
] as const satisfies readonly CatalogEntry[];

export type CatalogType = (typeof MOCK_CATALOG)[number]["type"];

export type CatalogEntryFor<T extends CatalogType> = Extract<
  (typeof MOCK_CATALOG)[number],
  { type: T }
>;

export function getCatalogEntry<T extends CatalogType>(
  type: T,
): CatalogEntryFor<T> {
  const entry = MOCK_CATALOG.find((item) => item.type === type);
  if (!entry) {
    throw new Error(`Unknown catalog type: ${type}`);
  }
  return entry as CatalogEntryFor<T>;
}
