import { X } from 'lucide-react';
import type { TopicSearchParams } from '../../types/search';

interface Props {
  params: TopicSearchParams;
  update: (patch: Partial<TopicSearchParams>) => void;
  clearAll: () => void;
}

interface Chip {
  key: string;
  label: string;
  remove: () => void;
}

const chip = 'inline-flex items-center gap-1.5 rounded-lg bg-tint px-2.5 py-1 text-sm text-secondary';

export function ActiveFilters({ params, update, clearAll }: Props) {
  const chips: Chip[] = [];
  if (params.q) chips.push({ key: 'q', label: `"${params.q}"`, remove: () => update({ q: '' }) });
  if (params.category) chips.push({ key: 'cat', label: params.category, remove: () => update({ category: '' }) });
  params.tags.forEach((t) => chips.push({ key: `tag-${t}`, label: t, remove: () => update({ tags: params.tags.filter((x) => x !== t) }) }));
  if (params.from) chips.push({ key: 'from', label: `From ${params.from}`, remove: () => update({ from: '' }) });
  if (params.to) chips.push({ key: 'to', label: `To ${params.to}`, remove: () => update({ to: '' }) });
  if (params.author) chips.push({ key: 'author', label: `@${params.author}`, remove: () => update({ author: '' }) });
  if (params.minUpvotes > 0) chips.push({ key: 'votes', label: `${params.minUpvotes}+ upvotes`, remove: () => update({ minUpvotes: 0 }) });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span key={c.key} className={chip}>
          {c.label}
          <button
            type="button"
            onClick={c.remove}
            aria-label={`Remove filter: ${c.label}`}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-secondary hover:text-black"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
      <button type="button" onClick={clearAll} className="text-sm font-medium text-secondary hover:text-black">
        Clear all
      </button>
    </div>
  );
}
