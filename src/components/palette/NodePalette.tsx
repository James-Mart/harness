import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorSidebar } from "@/components/layout/EditorSidebar";
import { setCatalogDragData } from "@/authoring/catalogDrag";
import type { PaletteGroup } from "@/components/palette/catalogPalette";
import type { CatalogType } from "@/model/catalog";

type NodePaletteProps = {
  groups: PaletteGroup[];
  onAddCatalogNode?: (type: CatalogType) => void;
  /** When true, block add / drag (Run mode). */
  readOnly?: boolean;
};

export function NodePalette({
  groups,
  onAddCatalogNode,
  readOnly = false,
}: NodePaletteProps) {
  const canAdd = !readOnly && onAddCatalogNode !== undefined;

  return (
    <EditorSidebar title="Node palette" side="left" data-testid="node-palette">
      <Input
        type="search"
        placeholder="Search nodes…"
        disabled
        aria-label="Search nodes"
      />
      {groups.map((group) => (
        <section key={group.name}>
          <h3 className="text-muted-foreground mb-2 text-xs font-medium">
            {group.name}
          </h3>
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.type}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  draggable={canAdd}
                  disabled={!canAdd}
                  className="w-full cursor-grab justify-start active:cursor-grabbing"
                  data-catalog-type={item.type}
                  data-testid={`palette-item-${item.type}`}
                  onClick={() => {
                    if (!canAdd) return;
                    onAddCatalogNode?.(item.type);
                  }}
                  onDragStart={(event) => {
                    if (!canAdd) return;
                    setCatalogDragData(event.dataTransfer, item.type);
                  }}
                >
                  {item.title}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </EditorSidebar>
  );
}
