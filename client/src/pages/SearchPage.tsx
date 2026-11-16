import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUp, MessageSquare, Search, Tag as TagIcon, X } from 'lucide-react';
import type { SearchResponse, SearchSort, SearchTopicResult } from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Pagination } from '../components/search/Pagination';
import { EmptyState } from '../components/search/EmptyState';
import { searchTopics } from '../api/search';
import { listCategories, listTags } from '../api/taxonomy';
import type { Category, Tag } from '../api/types';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const tags = searchParams.getAll('tag').filter(Boolean);
  const sort = (searchParams.get('sort') as SearchSort) || 'relevance';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [inputVal, setInputVal] = useState(q);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Sync input with q param when URL changes
  useEffect(() => {
    setInputVal(q);
  }, [q]);

  // Load taxonomy once
  useEffect(() => {
    let cancelled = false;
    Promise.all([listCategories(), listTags()]).then(([catRes, tagRes]) => {
      if (cancelled) return;
      if (catRes.success) setCategories(catRes.data.categories);
      if (tagRes.success) setAllTags(tagRes.data.tags);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Update URL search parameters
  const updateParams = (patch: {
    q?: string;
    category?: string;
    tags?: string[];
    sort?: SearchSort;
    page?: number;
  }) => {
    const next = new URLSearchParams();
    const nextQ = patch.q !== undefined ? patch.q : q;
    if (nextQ.trim()) next.set('q', nextQ.trim());

    const nextCat = patch.category !== undefined ? patch.category : category;
    if (nextCat) next.set('category', nextCat);

    const nextTags = patch.tags !== undefined ? patch.tags : tags;
    for (const t of nextTags) {
      if (t) next.append('tag', t);
    }

    const nextSort = patch.sort !== undefined ? patch.sort : sort;
    if (nextSort && nextSort !== 'relevance') next.set('sort', nextSort);

    const isFilterChange =
      patch.q !== undefined ||
      patch.category !== undefined ||
      patch.tags !== undefined ||
      patch.sort !== undefined;
    const nextPage = patch.page !== undefined ? patch.page : isFilterChange ? 1 : page;
    if (nextPage > 1) next.set('page', String(nextPage));

    setSearchParams(next);
  };

  // Perform search when q, category, tags, sort, or page in URL changes
  useEffect(() => {
    const trimmedQ = q.trim();
    if (!trimmedQ) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (trimmedQ.length < 2) {
      setData(null);
      setError('Please enter at least 2 characters to search.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    searchTopics({
      q: trimmedQ,
      category: category || undefined,
      tags: tags.length > 0 ? tags : undefined,
      sort,
      page,
    }).then((res) => {
      if (cancelled) return;
      setIsLoading(false);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error.message || 'An error occurred while searching.');
        setData(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [q, category, tags.join(','), sort, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: inputVal.trim() });
  };

  const toggleTag = (tagName: string) => {
    const nextTags = tags.includes(tagName)
      ? tags.filter((t) => t !== tagName)
      : [...tags, tagName];
    updateParams({ tags: nextTags });
  };

  return (
    <PageShell>
      {/* Top Banner & Search Bar */}
      <section aria-labelledby="search-heading" className="border-b border-line bg-white">
        <div className="mx-auto max-w-content px-6 py-10 md:py-14">
          <p className="text-sm font-medium text-muted">Search</p>
          <h1
            id="search-heading"
            className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[36px]"
          >
            Explore Technical Topics
          </h1>
          <p className="mt-2 text-base text-body">
            Search published topics and developer perspectives by keyword.
          </p>

          <form
            role="search"
            onSubmit={handleSearchSubmit}
            className="mt-6 flex max-w-2xl gap-3"
          >
            <div className="relative flex-1">
              <label htmlFor="search-input" className="sr-only">
                Search query
              </label>
              <input
                id="search-input"
                name="q"
                type="search"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search topics, e.g. caching, postgres, auth..."
                data-testid="search-input"
                className="h-12 w-full rounded-lg border border-line bg-white pl-11 pr-4 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
              <Search
                className="absolute left-4 top-3.5 h-5 w-5 text-muted"
                aria-hidden="true"
              />
            </div>
            <button
              type="submit"
              data-testid="search-button"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-black px-6 text-sm font-medium text-white hover:bg-secondary"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Main Content Area: Filters + Results */}
      <div className="bg-tint/20">
        <div className="mx-auto max-w-content px-6 py-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Filter Sidebar */}
            <aside aria-label="Filters" className="space-y-6 md:col-span-1">
              {/* Category Dropdown */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <label
                  htmlFor="category-dropdown"
                  className="block text-sm font-semibold text-ink"
                >
                  Category
                </label>
                <select
                  id="category-dropdown"
                  value={category}
                  onChange={(e) => updateParams({ category: e.target.value })}
                  data-testid="category-dropdown"
                  className="mt-2.5 h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tag Selector */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Tags</span>
                  {tags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => updateParams({ tags: [] })}
                      className="text-xs font-medium text-muted hover:text-ink"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tag selector">
                  {allTags.map((t) => {
                    const isSelected = tags.includes(t.name);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.name)}
                        aria-pressed={isSelected}
                        data-testid={`tag-filter-${t.name}`}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-black text-white'
                            : 'border border-line bg-tint/60 text-secondary hover:border-ink hover:text-black'
                        }`}
                      >
                        <TagIcon className="h-3 w-3" aria-hidden="true" />
                        {t.name}
                        {isSelected && <X className="ml-0.5 h-3 w-3" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Results Column */}
            <main id="search-results-top" className="space-y-6 md:col-span-3">
              {/* Controls bar: Result Count + Sort Dropdown */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {data !== null ? (
                    <p
                      data-testid="search-result-count"
                      aria-live="polite"
                      className="text-sm font-medium text-ink"
                    >
                      <span className="font-semibold text-ink">{data.total}</span>{' '}
                      {data.total === 1 ? 'result' : 'results'} for{' '}
                      <span className="font-semibold text-ink">&ldquo;{q}&rdquo;</span>
                    </p>
                  ) : q.trim().length >= 2 ? (
                    <p className="text-sm text-muted">Searching...</p>
                  ) : (
                    <p className="text-sm text-muted">Enter a search keyword to find topics.</p>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-dropdown" className="text-sm font-medium text-muted">
                    Sort:
                  </label>
                  <select
                    id="sort-dropdown"
                    value={sort}
                    onChange={(e) => updateParams({ sort: e.target.value as SearchSort })}
                    data-testid="sort-dropdown"
                    className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="most_upvotes">Most Upvotes</option>
                    <option value="most_perspectives">Most Perspectives</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Chips */}
              {(category || tags.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Active filters">
                  <span className="text-xs font-semibold text-muted">Active:</span>
                  {category && (
                    <button
                      type="button"
                      onClick={() => updateParams({ category: '' })}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-ink hover:bg-tint"
                    >
                      <span>Category: {category}</span>
                      <X className="h-3 w-3 text-muted" aria-hidden="true" />
                    </button>
                  )}
                  {tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-ink hover:bg-tint"
                    >
                      <span>Tag: {t}</span>
                      <X className="h-3 w-3 text-muted" aria-hidden="true" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateParams({ category: '', tags: [] })}
                    className="text-xs text-muted underline hover:text-ink ml-1"
                  >
                    Reset all
                  </button>
                </div>
              )}

              {/* Content States */}
              {isLoading ? (
                <div
                  data-testid="search-loading"
                  role="status"
                  aria-live="polite"
                  className="space-y-4 py-4"
                >
                  <div className="h-36 w-full animate-pulse rounded-xl border border-line bg-white" />
                  <div className="h-36 w-full animate-pulse rounded-xl border border-line bg-white" />
                  <div className="h-36 w-full animate-pulse rounded-xl border border-line bg-white" />
                  <span className="sr-only">Loading search results...</span>
                </div>
              ) : error ? (
                <div
                  role="alert"
                  data-testid="search-error"
                  className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
                >
                  {error}
                </div>
              ) : !q.trim() ? (
                <EmptyState
                  title="Search Structured Topics"
                  text="Find architectural designs, database strategies, security solutions and developer perspectives."
                />
              ) : data && data.results.length === 0 ? (
                <div data-testid="search-empty">
                  <EmptyState
                    title="No topics match your search"
                    text={`We couldn't find any topics matching "${q}". Try a different keyword or clear active filters.`}
                    onClear={() => updateParams({ category: '', tags: [] })}
                  />
                </div>
              ) : data && data.results.length > 0 ? (
                <div className="space-y-4">
                  <ul className="space-y-4" aria-label="Topic search results">
                    {data.results.map((result: SearchTopicResult) => (
                      <li key={result.id}>
                        <article
                          data-testid="search-result-card"
                          className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-ink"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                              {result.category.name}
                            </span>
                            {result.matchedIn === 'perspective' && (
                              <span className="rounded bg-tint px-2 py-0.5 text-[11px] font-medium text-secondary">
                                Matched in Perspective
                              </span>
                            )}
                            {result.matchedIn === 'both' && (
                              <span className="rounded bg-tint px-2 py-0.5 text-[11px] font-medium text-secondary">
                                Matched in Topic &amp; Perspective
                              </span>
                            )}
                          </div>

                          <h2 className="mt-2 text-lg font-semibold leading-snug text-ink">
                            <Link
                              to={`/topics/${result.slug}`}
                              className="hover:underline"
                            >
                              {result.title}
                            </Link>
                          </h2>

                          <p className="mt-2 line-clamp-2 text-sm text-body">
                            {result.shortDescription}
                          </p>

                          {result.tags.length > 0 && (
                            <ul
                              className="mt-3 flex flex-wrap gap-1.5"
                              aria-label="Tags"
                            >
                              {result.tags.map((t) => (
                                <li
                                  key={t}
                                  className="rounded-md bg-tint px-2 py-0.5 text-xs text-body"
                                >
                                  {t}
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="mt-4 flex items-center gap-6 border-t border-line/60 pt-3 text-xs font-medium text-secondary">
                            <span className="inline-flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                              {result.perspectiveCount}{' '}
                              {result.perspectiveCount === 1 ? 'perspective' : 'perspectives'}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                              {result.totalUpvotes}{' '}
                              {result.totalUpvotes === 1 ? 'upvote' : 'upvotes'}
                            </span>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>

                  {/* Pagination */}
                  <Pagination
                    page={page}
                    total={data.total}
                    pageSize={data.pageSize || 20}
                    onPage={(newPage) => updateParams({ page: newPage })}
                    scrollToId="search-results-top"
                  />
                </div>
              ) : null}
            </main>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default SearchPage;
