import { MOCK_CATALOG } from "@/model/catalog";

export type PaletteGroup = {
  name: string;
  items: string[];
};

function buildCatalogPaletteGroups(): PaletteGroup[] {
  const groups = new Map<string, string[]>();
  for (const entry of MOCK_CATALOG) {
    const items = groups.get(entry.category) ?? [];
    items.push(entry.title);
    groups.set(entry.category, items);
  }
  return [...groups.entries()].map(([name, items]) => ({ name, items }));
}

/** Immutable palette groups derived once from the mock catalog. */
export const CATALOG_PALETTE_GROUPS: PaletteGroup[] =
  buildCatalogPaletteGroups();
