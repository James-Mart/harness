export type PaletteGroup = {
  name: string;
  items: string[];
};

/** Temporary catalog chrome until mock-data-model lands. */
export const PLACEHOLDER_PALETTE_GROUPS: PaletteGroup[] = [
  {
    name: "Control",
    items: ["Sequence", "Branch", "Gate"],
  },
  {
    name: "Containers",
    items: ["ForEach", "Parallel"],
  },
  {
    name: "Agents",
    items: ["Implementor", "Validator"],
  },
];
