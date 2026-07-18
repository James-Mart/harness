import * as React from "react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
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

/** Stacked label + control row for editable inspector fields. */
export function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-muted-foreground block text-xs">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Optional positive-int number field used by structural and run-config inspectors. */
export function OptionalPositiveIntField({
  label,
  id,
  testId,
  placeholder,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  id: string;
  testId: string;
  placeholder: string;
  value: number | undefined;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  return (
    <FieldRow label={label} htmlFor={id}>
      <Input
        id={id}
        data-testid={testId}
        type="number"
        min={1}
        placeholder={placeholder}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldRow>
  );
}

/** Native select styled to match the inspector inputs. */
export function InspectorSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-input h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/** Checkbox + label row matching other inspector controls. */
export function InspectorCheckbox({
  label,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className={cn("size-4 accent-current", className)}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
