import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "glass";
}

const variantClasses = {
  default:
    "border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]",
  elevated:
    "border border-white/10 bg-[var(--surface-elevated)] shadow-[0_24px_60px_rgba(2,6,23,0.45)]",
  glass:
    "border border-white/12 bg-[var(--surface-glass)] backdrop-blur-xl shadow-[var(--shadow-soft)]",
};

export function Card({
  className,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] p-6",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
