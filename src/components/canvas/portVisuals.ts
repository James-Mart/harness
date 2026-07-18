import type { JSONSchema, Port } from "@/model/types";

/**
 * Display key for a port's schema — prefers `title`, then structural type.
 * Used for labels / tooltips, not accent colour.
 */
export function schemaTypeKey(schema: JSONSchema): string {
  if (typeof schema.title === "string" && schema.title.length > 0) {
    return schema.title;
  }
  return schemaAccentFamily(schema);
}

/** Structural JSON-Schema family used for accent colour. */
export function schemaAccentFamily(schema: JSONSchema): string {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return "enum";
  }
  if (typeof schema.type === "string") {
    return schema.type;
  }
  return "any";
}

/**
 * Accent colour for a data port from structural schema shape
 * (`type` / `enum`), not mock-specific titles.
 */
export function schemaAccent(schema: JSONSchema): string {
  switch (schemaAccentFamily(schema)) {
    case "string":
      return "var(--chart-2)";
    case "boolean":
      return "var(--chart-3)";
    case "object":
      return "var(--chart-4)";
    case "array":
      return "var(--chart-1)";
    case "enum":
      return "var(--chart-5)";
    default:
      return "var(--muted-foreground)";
  }
}

export function portsByDirection(ports: readonly Port[]): {
  inputs: Port[];
  outputs: Port[];
} {
  return {
    inputs: ports.filter((port) => port.direction === "in"),
    outputs: ports.filter((port) => port.direction === "out"),
  };
}
