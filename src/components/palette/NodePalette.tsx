import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorSidebar } from "@/components/layout/EditorSidebar";
import type { PaletteGroup } from "@/components/palette/catalogPalette";

type NodePaletteProps = {
  groups: PaletteGroup[];
};

export function NodePalette({ groups }: NodePaletteProps) {
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
              <li key={item}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full justify-start disabled:cursor-default"
                >
                  {item}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </EditorSidebar>
  );
}
