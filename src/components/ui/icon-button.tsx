"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
}

export function IconButton({
  className,
  icon,
  label,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
