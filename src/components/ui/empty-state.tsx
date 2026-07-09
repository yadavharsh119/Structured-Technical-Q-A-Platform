import { Button, ButtonLink } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  action?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-white/14 bg-white/3 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/6 text-sky-100">
        <svg
          viewBox="0 0 24 24"
          className="size-5 fill-none stroke-current stroke-1.5"
        >
          <path d="M12 7v10M7 12h10" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--foreground-muted)]">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <ButtonLink href={actionHref} className="mt-6">
          {actionLabel}
        </ButtonLink>
      ) : null}
      {actionLabel && action ? (
        <Button className="mt-6" onClick={action}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
