import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EditorSidebarProps = {
  title: string;
  side: "left" | "right";
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function EditorSidebar({
  title,
  side,
  children,
  className,
  "data-testid": testId,
}: EditorSidebarProps) {
  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex h-full min-h-0 flex-col",
        side === "left" ? "border-r" : "border-l",
        className,
      )}
      data-testid={testId}
    >
      <div className="border-sidebar-border border-b px-3 py-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {title}
        </h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
        {children}
      </div>
    </aside>
  );
}
