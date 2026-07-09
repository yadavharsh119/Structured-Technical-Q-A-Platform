"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({
  label,
  hint,
  error,
  icon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-100">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-white/5 px-4",
          error ? "border-red-400/45" : "border-white/10",
        )}
      >
        {icon ? <span className="text-slate-400">{icon}</span> : null}
        <input
          id={inputId}
          className={cn(
            "h-12 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none",
            className,
          )}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-200">{error}</p>
      ) : hint ? (
        <p className="text-sm text-[var(--foreground-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
