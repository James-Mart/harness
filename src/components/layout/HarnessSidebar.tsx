import { Button } from "@/components/ui/button";
import { EditorSidebar } from "@/components/layout/EditorSidebar";
import {
  SidebarItemButton,
  SidebarItemList,
} from "@/components/layout/SidebarItemList";
import type { Harness } from "@/model";

type HarnessSidebarProps = {
  harnesses: Harness[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
};

export function HarnessSidebar({
  harnesses,
  selectedId,
  onSelect,
  onAdd,
}: HarnessSidebarProps) {
  return (
    <EditorSidebar
      title="Harnesses"
      side="left"
      className="w-48 shrink-0"
      data-testid="harness-sidebar"
      headerAction={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Add harness"
          data-testid="harness-add"
          onClick={onAdd}
        >
          +
        </Button>
      }
    >
      <SidebarItemList data-testid="harness-list">
        {harnesses.map((harness) => {
          const isSelected = harness.id === selectedId;
          return (
            <li key={harness.id}>
              <SidebarItemButton
                variant={isSelected ? "default" : "ghost"}
                data-testid={`harness-item-${harness.id}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(harness.id)}
              >
                {harness.title}
              </SidebarItemButton>
            </li>
          );
        })}
      </SidebarItemList>
    </EditorSidebar>
  );
}
