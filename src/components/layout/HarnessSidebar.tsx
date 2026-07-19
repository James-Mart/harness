import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditorSidebar } from "@/components/layout/EditorSidebar";
import {
  SidebarItemButton,
  SidebarItemList,
  SidebarItemRow,
} from "@/components/layout/SidebarItemList";
import type { Harness } from "@/model";

type HarnessSidebarProps = {
  harnesses: Harness[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

type HarnessSidebarItemProps = {
  harness: Harness;
  selected: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

function HarnessSidebarItem({
  harness,
  selected,
  onSelect,
  onRename,
  onDelete,
}: HarnessSidebarItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(harness.title);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Guards against blur after Enter/Escape committing twice or undoing cancel. */
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!isEditing) return;
    finishedRef.current = false;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  function beginRename() {
    setDraftTitle(harness.title);
    setIsEditing(true);
  }

  function endEdit(commit: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (commit) {
      const title = draftTitle.trim();
      if (title.length > 0) onRename(harness.id, title);
    }
    setIsEditing(false);
  }

  function onRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      endEdit(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      endEdit(false);
    }
  }

  return (
    <SidebarItemRow
      action={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Delete ${harness.title}`}
          data-testid={`harness-delete-${harness.id}`}
          className="text-muted-foreground shrink-0"
          onClick={() => onDelete(harness.id)}
        >
          ×
        </Button>
      }
    >
      {isEditing ? (
        <Input
          ref={inputRef}
          value={draftTitle}
          aria-label={`Rename ${harness.title}`}
          data-testid={`harness-rename-${harness.id}`}
          className="h-7 min-w-0 flex-1 px-2 text-[0.8rem]"
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={() => endEdit(true)}
          onKeyDown={onRenameKeyDown}
        />
      ) : (
        <SidebarItemButton
          variant={selected ? "default" : "ghost"}
          className="min-w-0 flex-1"
          data-testid={`harness-item-${harness.id}`}
          aria-pressed={selected}
          onClick={() => onSelect(harness.id)}
          onDoubleClick={(event: MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            beginRename();
          }}
        >
          <span className="truncate">{harness.title}</span>
        </SidebarItemButton>
      )}
    </SidebarItemRow>
  );
}

export function HarnessSidebar({
  harnesses,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
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
      {harnesses.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="harness-list-empty"
        >
          No harnesses
        </p>
      ) : (
        <SidebarItemList data-testid="harness-list">
          {harnesses.map((harness) => (
            <HarnessSidebarItem
              key={harness.id}
              harness={harness}
              selected={harness.id === selectedId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </SidebarItemList>
      )}
    </EditorSidebar>
  );
}
