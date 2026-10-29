import * as React from "react";
import { cn } from "../../lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-xl border border-[var(--color-border-control)] bg-white/72 px-4 py-3 text-sm text-[var(--color-text-default)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand-secondary)] focus:ring-4 focus:ring-blue-100/70",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
