import { cn } from "@/lib/utils";

interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingState({
  title = "Loading interface",
  description = "Preparing the next layer of the platform.",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center rounded-[var(--radius-card)] border border-white/10 bg-white/4 px-6 text-center",
        className,
      )}
    >
      <div className="mb-4 size-10 animate-spin rounded-full border-2 border-sky-300/50 border-t-transparent" />
      <p className="text-base font-medium text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-[var(--foreground-muted)]">
        {description}
      </p>
    </div>
  );
}
