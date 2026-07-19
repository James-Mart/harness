import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarItemListProps = {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/** Shared sidebar row list (`ul.space-y-1`) for palette and harness lists. */
export function SidebarItemList({
  children,
  className,
  "data-testid": testId,
}: SidebarItemListProps) {
  return (
    <ul className={cn("space-y-1", className)} data-testid={testId}>
      {children}
    </ul>
  );
}

type SidebarItemRowProps = {
  children: ReactNode;
  /** Optional trailing control (e.g. delete); enables flex layout. */
  action?: ReactNode;
  className?: string;
};

/** List row for a `SidebarItemButton`, optionally with a trailing action. */
export function SidebarItemRow({
  children,
  action,
  className,
}: SidebarItemRowProps) {
  return (
    <li
      className={cn(
        action !== undefined ? "flex items-center gap-0.5" : undefined,
        className,
      )}
    >
      {children}
      {action}
    </li>
  );
}

type SidebarItemButtonProps = ComponentProps<typeof Button>;

/** Full-width sidebar row button used inside `SidebarItemList` items. */
export function SidebarItemButton({
  className,
  size = "sm",
  type = "button",
  ...props
}: SidebarItemButtonProps) {
  return (
    <Button
      type={type}
      size={size}
      className={cn("w-full justify-start", className)}
      {...props}
    />
  );
}
