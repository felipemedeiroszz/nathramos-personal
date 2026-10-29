import { cn } from "@/lib/utils";
import {
  ButtonHTMLAttributes,
  forwardRef,
  Children,
  isValidElement,
  cloneElement,
} from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

const buttonBaseClasses =
  "inline-flex items-center justify-center rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_30px_hsl(var(--primary)/0.25)]",
  secondary:
    "bg-transparent border border-border/60 text-text hover:border-primary/60 hover:text-primary hover:bg-surface-secondary/50",
  destructive:
    "border border-text/25 bg-text/[0.08] text-text hover:bg-text/[0.14] hover:-translate-y-0.5 active:translate-y-0",
  ghost: "bg-transparent text-text hover:bg-surface-secondary/50",
  outline:
    "bg-transparent border border-border/60 text-text hover:border-primary/60 hover:text-primary",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-13 px-6 text-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      buttonBaseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className,
    );

    if (asChild) {
      const child = Children.only(children);
      if (!isValidElement(child)) return null;
      return cloneElement(child as React.ReactElement<any>, {
        ...props,
        className: cn((child as any).props.className, classes),
        "data-ui": "button",
        "data-variant": variant,
        "data-size": size,
      });
    }

    return (
      <button
        ref={ref}
        data-ui="button"
        data-variant={variant}
        data-size={size}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
