interface Props {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  scrollToId?: string;
}

export function Pagination({ page, total, pageSize, onPage, scrollToId = 'results-top' }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const nums: number[] = [];
  for (let i = 1; i <= pages; i++) nums.push(i);

  const btn = 'inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors';
  const go = (p: number) => {
    onPage(p);
    document.getElementById(scrollToId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => go(page - 1)} className={`${btn} border border-line bg-white text-ink hover:bg-tint disabled:opacity-40`}>
        Previous
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => go(n)}
          aria-current={n === page ? 'page' : undefined}
          aria-label={`Page ${n}`}
          className={n === page ? `${btn} bg-black text-white` : `${btn} border border-line bg-white text-ink hover:bg-tint`}
        >
          {n}
        </button>
      ))}
      <button type="button" disabled={page >= pages} onClick={() => go(page + 1)} className={`${btn} border border-line bg-white text-ink hover:bg-tint disabled:opacity-40`}>
        Next
      </button>
    </nav>
  );
}
