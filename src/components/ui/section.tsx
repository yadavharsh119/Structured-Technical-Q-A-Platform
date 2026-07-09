import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: SectionProps) {
  return (
    <section id={id} className={cn("py-20 sm:py-24", className)}>
      <div className="container-shell">
        <div className="mb-10 max-w-2xl">
          {eyebrow ? (
            <p className="mb-3 text-xs font-semibold tracking-[0.26em] text-sky-200 uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-[var(--foreground-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
