"use client";

import Link from "next/link";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--foreground)] text-slate-950 shadow-[0_12px_36px_rgba(125,211,252,0.18)] hover:-translate-y-0.5 hover:bg-white",
  secondary:
    "border border-[var(--border-strong)] bg-white/6 text-white hover:border-white/30 hover:bg-white/10",
  ghost:
    "bg-transparent text-[var(--foreground-muted)] hover:bg-white/6 hover:text-white",
  destructive:
    "border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/16",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-medium whitespace-nowrap",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    "disabled:pointer-events-none disabled:opacity-55",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
});

export function ButtonLink({
  href,
  children,
  className,
  variant = "primary",
  size = "md",
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonStyles({ variant, size, className })}>
      {children}
    </Link>
  );
}
