import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-[var(--color-border-control)] bg-white/72 px-4 text-sm text-[var(--color-text-default)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-brand-secondary)] focus:ring-4 focus:ring-blue-100/70",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
