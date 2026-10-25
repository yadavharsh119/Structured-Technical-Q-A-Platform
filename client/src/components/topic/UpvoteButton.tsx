import { ChevronUp } from 'lucide-react';

interface Props {
  upvoteCount: number;
  voted: boolean;
  isGuest: boolean;
  isOwn: boolean;
  isPending: boolean;
  onToggle: () => void;
}

export function UpvoteButton({ upvoteCount, voted, isGuest, isOwn, isPending, onToggle }: Props) {
  const isDisabled = isOwn || isPending;
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
        onClick={onToggle}
        disabled={isDisabled}
        aria-pressed={voted}
        aria-label={`Upvote. ${upvoteCount} upvotes`}
        title={tooltip}
        data-testid="perspective-upvote-button"
        className={
          voted
            ? 'inline-flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white disabled:cursor-not-allowed disabled:opacity-40'
            : 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-ink hover:bg-tint disabled:cursor-not-allowed disabled:opacity-40'
        }
      >
        <ChevronUp className="h-5 w-5" aria-hidden="true" />
      </button>
      <span
        className="text-sm font-semibold text-ink"
        aria-hidden="true"
        data-testid="perspective-upvote-count"
      >
        {upvoteCount}
      </span>
      <span className="sr-only" aria-live="polite">
        {upvoteCount} upvotes
      </span>
    </div>
  );
}
