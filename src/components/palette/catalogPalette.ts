import {
  MOCK_CATALOG,
  type CatalogEntry,
  type CatalogType,
} from "@/model/catalog";

/** Palette row derived from catalog fields (narrowed `type`). */
export type PaletteItem = Pick<CatalogEntry, "title"> & { type: CatalogType };

export type PaletteGroup = {
  name: string;
  items: PaletteItem[];
};

function buildCatalogPaletteGroups(): PaletteGroup[] {
  const groups = new Map<string, PaletteItem[]>();
  for (const entry of MOCK_CATALOG) {
    const items = groups.get(entry.category) ?? [];
    items.push({ type: entry.type, title: entry.title });
    groups.set(entry.category, items);
  }
  return [...groups.entries()].map(([name, items]) => ({ name, items }));
}

/** Immutable palette groups derived once from the mock catalog. */
export const CATALOG_PALETTE_GROUPS: PaletteGroup[] =
  buildCatalogPaletteGroups();
