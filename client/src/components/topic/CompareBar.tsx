import { Link } from 'react-router-dom';

interface Props {
  slug: string;
  selected: string[];
  onClear: () => void;
  message?: string | null;
}

export function CompareBar({ selected, onClear, message }: Props) {
  if (selected.length === 0) return null;
  const ids = selected.join(',');

  return (
    <div role="region" aria-label="Comparison selection" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-body">
            <span className="font-semibold text-ink">{selected.length} selected</span>
            {selected.length === 1 && <span className="text-muted"> — Select at least 2 to compare</span>}
          </p>
          {message && (
            <span role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              {message}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClear} className="text-sm font-medium text-secondary hover:text-black">
            Clear
          </button>
          {selected.length >= 2 ? (
            <Link
              to={`/compare?ids=${ids}`}
              className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary"
            >
              Compare
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white opacity-40"
            >
              Compare
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
