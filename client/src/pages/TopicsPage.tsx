import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { SearchBar } from '../components/search/SearchBar';
import { FilterPanel } from '../components/search/FilterPanel';
import { ActiveFilters } from '../components/search/ActiveFilters';
import { SortSelect } from '../components/search/SortSelect';
import { Pagination } from '../components/search/Pagination';
import { TopicResultCard } from '../components/search/TopicResultCard';
import { EmptyState } from '../components/search/EmptyState';
import { useTopicSearchParams } from '../hooks/useTopicSearchParams';
import { useTopicSearch } from '../hooks/useTopicSearch';

export function TopicsPage() {
  const { params, update, clearAll } = useTopicSearchParams();
  const { data } = useTopicSearch(params);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <PageShell>
      <section aria-labelledby="topics-heading" className="bg-white">
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          <p className="text-sm font-medium text-muted">Topics</p>
          <h1 id="topics-heading" className="mt-3 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]">
            Browse Topics
          </h1>
          <p className="mt-4 max-w-2xl text-[20px] text-body">
            Search Perspectives across every published Topic, or filter by category and tag.
          </p>
          <div className="mt-8">
            <SearchBar initialValue={params.q} onSearch={(q) => update({ q })} />
          </div>
        </div>
      </section>
      <div className="border-t border-line bg-white">
        <div className="mx-auto max-w-content gap-8 px-6 py-10 lg:grid lg:grid-cols-[280px_1fr]">
          <div>
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="topic-filters"
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink hover:bg-tint lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
            </button>
            <div id="topic-filters" className={`${filtersOpen ? 'mt-4 block' : 'hidden'} lg:mt-0 lg:block`}>
              <FilterPanel params={params} update={update} clearAll={clearAll} />
            </div>
          </div>
          <section aria-label="Topic results" className="mt-8 lg:mt-0">
            <div id="results-top" className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className="text-base text-body">
                <span className="font-semibold text-ink">{data.total} results</span>
                {params.q && <span> for &ldquo;{params.q}&rdquo;</span>}
              </p>
              <SortSelect value={params.sort} onChange={(sort) => update({ sort })} />
            </div>
            <div className="mt-4">
              <ActiveFilters params={params} update={update} clearAll={clearAll} />
            </div>
            {data.items.length === 0 ? (
              <div className="mt-6">
                <EmptyState onClear={clearAll} />
              </div>
            ) : (
              <ul className="fade-in mt-6 space-y-4">
                {data.items.map((t) => (
                  <li key={t.slug}>
                    <TopicResultCard topic={t} />
                  </li>
                ))}
              </ul>
            )}
            <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPage={(page) => update({ page }, false)} />
            {totalPages > 1 && (
              <p className="mt-4 text-center text-sm text-muted">
                Page {data.page} of {totalPages}
              </p>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}

export default TopicsPage;
