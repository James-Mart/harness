import { MOCK_CATALOG, type CatalogType } from "@/model/catalog";

/** MIME type for palette → canvas catalog-type drag payloads. */
export const CATALOG_DRAG_MIME = "application/x-harness-catalog-type";

const CATALOG_TYPES = new Set<string>(MOCK_CATALOG.map((entry) => entry.type));

function isCatalogType(value: string): value is CatalogType {
  return CATALOG_TYPES.has(value);
}

export function setCatalogDragData(
  dataTransfer: DataTransfer,
  type: CatalogType,
): void {
  dataTransfer.setData(CATALOG_DRAG_MIME, type);
  dataTransfer.effectAllowed = "copy";
}

/** Read a catalog type from a drag payload; unknown values yield null. */
export function readCatalogDragType(
  dataTransfer: DataTransfer,
): CatalogType | null {
  const type = dataTransfer.getData(CATALOG_DRAG_MIME);
  return isCatalogType(type) ? type : null;
}
