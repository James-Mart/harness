import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function InspectorCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-lg border p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DetailRow({
  label,
  children,
  testId,
}: {
  label: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd data-testid={testId}>{children}</dd>
    </div>
  );
}
