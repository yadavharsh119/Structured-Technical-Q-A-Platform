import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

interface Props {
  initialValue: string;
  onSearch: (q: string) => void;
}

export function SearchBar({ initialValue, onSearch }: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <form
      role="search"
      className="flex max-w-xl gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
    >
      <label htmlFor="topics-search" className="sr-only">
        Search topics
      </label>
      <input
        id="topics-search"
        name="q"
        type="search"
        aria-label="Search topics"
        placeholder="Search topics, e.g. rate limiting"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 w-full rounded-lg border border-line bg-white px-4 text-base text-ink placeholder:text-muted"
      />
      <button
        type="submit"
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-black px-5 text-sm font-medium text-white hover:bg-secondary"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        Search
      </button>
    </form>
  );
}
