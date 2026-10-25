import { useEffect, useState } from 'react';
import { PageShell } from '../components/layout/PageShell';
import { TopicResultCard } from '../components/search/TopicResultCard';
import { EmptyState } from '../components/search/EmptyState';
import { listTopics } from '../api/topics';
import { listCategories } from '../api/taxonomy';
import type { Category, Topic } from '../api/types';

export function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTopics(), listCategories()]).then(([topicsResponse, categoriesResponse]) => {
      if (cancelled) return;
      if (!topicsResponse.success) {
        setError(topicsResponse.error.message);
        setIsLoading(false);
        return;
      }
      if (!categoriesResponse.success) {
        setError(categoriesResponse.error.message);
        setIsLoading(false);
        return;
      }
      setTopics(topicsResponse.data.topics);
      setCategories(categoriesResponse.data.categories);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <PageShell>
      <section aria-labelledby="topics-heading" className="bg-white">
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          <p className="text-sm font-medium text-muted">Topics</p>
          <h1
            id="topics-heading"
            className="mt-3 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
          >
            Browse Topics
          </h1>
          <p className="mt-4 max-w-2xl text-[20px] text-body">
            Explore every published Topic and the questions that shaped it.
          </p>
        </div>
      </section>
      <div className="border-t border-line bg-white">
        <div className="mx-auto max-w-content px-6 py-10">
          <section aria-label="Topic results">
            {isLoading ? (
              <div
                className="animate-pulse space-y-4"
                role="status"
                aria-live="polite"
                data-testid="topics-loading"
              >
                <div className="h-5 w-32 rounded bg-tint" />
                <div className="h-32 w-full rounded-xl border border-line bg-tint/30" />
                <div className="h-32 w-full rounded-xl border border-line bg-tint/30" />
                <span className="sr-only">Loading topics...</span>
              </div>
            ) : error ? (
              <div
                role="alert"
                data-testid="topics-error"
                className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
              >
                {error}
              </div>
            ) : (
              <>
                <p aria-live="polite" className="text-base text-body">
                  <span className="font-semibold text-ink">{topics.length} topics</span>
                </p>
                {topics.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState
                      title="No Topics yet"
                      text="Published topics will appear here once a question has been approved."
                    />
                  </div>
                ) : (
                  <ul className="fade-in mt-6 space-y-4">
                    {topics.map((topic) => (
                      <li key={topic.id}>
                        <TopicResultCard
                          topic={topic}
                          categoryName={categoryNames.get(topic.categoryId) ?? 'Uncategorized'}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}

export default TopicsPage;
