import { ChevronUp } from 'lucide-react';

interface Props {
  id: string;
  upvotes: number;
  voted: boolean;
  isGuest: boolean;
  isOwn: boolean;
  onToggle: (id: string) => void;
  delta: number;
}

export function UpvoteButton({ id, upvotes, voted, isGuest, isOwn, onToggle, delta }: Props) {
  const count = upvotes + delta;
  const isDisabled = isGuest || isOwn;
  const tooltip = isGuest
    ? 'Log in to upvote'
    : isOwn
      ? "You can't vote on your own Perspective"
      : voted
        ? 'Remove upvote'
        : 'Upvote';

  return (
    <div className="flex items-center gap-2 md:flex-col md:gap-1">
      <button
        type="button"
        onClick={() => onToggle(id)}
        disabled={isDisabled}
        aria-pressed={voted}
        aria-label={`Upvote. ${count} upvotes`}
        title={tooltip}
        className={
          voted
            ? 'inline-flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white'
            : 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-ink hover:bg-tint disabled:cursor-not-allowed disabled:opacity-40'
        }
      >
        <ChevronUp className="h-5 w-5" aria-hidden="true" />
      </button>
      <span className="text-sm font-semibold text-ink" aria-hidden="true">{count}</span>
      <span className="sr-only" aria-live="polite">{count} upvotes</span>
    </div>
  );
}
