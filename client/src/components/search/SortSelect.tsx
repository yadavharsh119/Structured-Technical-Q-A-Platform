import { SORT_OPTIONS, type SortKey } from '../../types/search';

interface Props {
  value: SortKey;
  onChange: (sort: SortKey) => void;
}

export function SortSelect({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm font-medium text-muted">
        Sort
      </label>
      <select
        id="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="h-11 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
