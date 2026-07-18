import type { JSONSchema } from "@/model/types";

const TASK_SCHEMA = {
  type: "object",
  title: "Task",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
  },
  required: ["id", "title"],
} as const satisfies JSONSchema;

/** Named mock schemas referenced by catalog ports. */
export const MOCK_SCHEMAS = {
  string: { type: "string" },
  boolean: { type: "boolean" },
  any: {},
  task: TASK_SCHEMA,
  taskList: {
    type: "array",
    title: "Task[]",
    items: TASK_SCHEMA,
  },
  gateDecision: {
    type: "string",
    enum: ["ok", "deny"],
  },
} as const satisfies Record<string, JSONSchema>;

export type MockSchemaName = keyof typeof MOCK_SCHEMAS;

export function mockSchema(name: MockSchemaName): JSONSchema {
  return structuredClone(MOCK_SCHEMAS[name]) as JSONSchema;
}

/** Element schema for an array schema, or `any` when items are unspecified. */
export function itemSchemaOf(arraySchema: JSONSchema): JSONSchema {
  const items = arraySchema.items;
  if (items && typeof items === "object" && !Array.isArray(items)) {
    return structuredClone(items) as JSONSchema;
  }
  return mockSchema("any");
}
