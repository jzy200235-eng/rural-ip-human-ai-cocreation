import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold leading-none transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-secondary)] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-brand-primary)] text-white shadow-[var(--shadow-control)] hover:brightness-95",
        gradient: "app-gradient-primary text-white shadow-[0_16px_36px_rgba(74,106,218,0.28)] hover:brightness-105",
        pink: "app-gradient-primary text-white shadow-[0_16px_36px_rgba(74,106,218,0.22)] hover:brightness-105",
        secondary: "glass-chip text-[var(--color-brand-primary)] hover:bg-white/50",
        ghost: "text-[var(--color-text-muted)] hover:bg-white/35",
        outline: "glass-chip text-[var(--color-text-default)] hover:bg-white/52",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-5",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button };
