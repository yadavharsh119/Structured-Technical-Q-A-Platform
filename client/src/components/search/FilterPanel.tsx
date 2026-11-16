import { SEARCH_CATEGORIES, SEARCH_TAGS } from '../../data/mockTopics';
import type { TopicSearchParams } from '../../types/search';

interface Props {
  params: TopicSearchParams;
  update: (patch: Partial<TopicSearchParams>) => void;
  clearAll: () => void;
}

const MIN_UPVOTES = [
  { value: 0, label: 'Any' },
  { value: 10, label: '10+' },
  { value: 25, label: '25+' },
  { value: 50, label: '50+' },
];

const legend = 'text-sm font-medium text-ink';
const input = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-ink placeholder:text-muted';

export function FilterPanel({ params, update, clearAll }: Props) {
  const toggleTag = (tag: string) => {
    const tags = params.tags.includes(tag)
      ? params.tags.filter((t) => t !== tag)
      : [...params.tags, tag];
    update({ tags });
  };

  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <fieldset>
        <legend className={legend}>Category</legend>
        <div className="mt-3 space-y-2">
          {['', ...SEARCH_CATEGORIES].map((c) => (
            <label key={c || 'all'} className="flex cursor-pointer items-center gap-2 text-sm text-body">
              <input
                type="radio"
                name="category"
                value={c}
                checked={params.category === c}
                onChange={() => update({ category: c })}
                className="h-4 w-4 accent-black"
              />
              {c || 'All'}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-6 border-t border-line pt-6">
        <legend className={legend}>Tags</legend>
        <div className="mt-3 space-y-2">
          {SEARCH_TAGS.map((tag) => (
            <label key={tag} className="flex cursor-pointer items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={params.tags.includes(tag)}
                onChange={() => toggleTag(tag)}
                className="h-4 w-4 rounded accent-black"
              />
              {tag}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-6 border-t border-line pt-6">
        <legend className={legend}>Date range</legend>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="filter-from" className="mb-1 block text-sm text-body">From</label>
            <input id="filter-from" type="date" value={params.from} onChange={(e) => update({ from: e.target.value })} className={input} />
          </div>
          <div>
            <label htmlFor="filter-to" className="mb-1 block text-sm text-body">To</label>
            <input id="filter-to" type="date" value={params.to} onChange={(e) => update({ to: e.target.value })} className={input} />
          </div>
        </div>
      </fieldset>
      <fieldset className="mt-6 border-t border-line pt-6">
        <legend className={legend}>Author</legend>
        <label htmlFor="filter-author" className="sr-only">Author username</label>
        <input
          id="filter-author"
          type="text"
          placeholder="e.g. maya_chen"
          value={params.author}
          onChange={(e) => update({ author: e.target.value })}
          className={`${input} mt-3`}
        />
      </fieldset>
      <fieldset className="mt-6 border-t border-line pt-6">
        <legend className={legend}>Minimum upvotes</legend>
        <label htmlFor="filter-min-upvotes" className="sr-only">Minimum upvotes</label>
        <select
          id="filter-min-upvotes"
          value={params.minUpvotes}
          onChange={(e) => update({ minUpvotes: Number(e.target.value) })}
          className={`${input} mt-3`}
        >
          {MIN_UPVOTES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </fieldset>
      <button
        type="button"
        onClick={clearAll}
        className="mt-6 text-sm font-medium text-secondary hover:text-black"
      >
        Clear all filters
      </button>
    </div>
  );
}
