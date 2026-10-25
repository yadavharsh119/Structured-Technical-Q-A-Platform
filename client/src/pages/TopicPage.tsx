import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { TopicHeader } from '../components/topic/TopicHeader';
import { SourceQuestionCard } from '../components/topic/SourceQuestionCard';
import { EmptyState } from '../components/search/EmptyState';
import { getTopic } from '../api/topics';
import { listCategories } from '../api/taxonomy';
import type { Question, Topic } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { NotFoundPage } from './NotFoundPage';

const icon = <MessageSquare className="mx-auto h-8 w-8 text-deco" aria-hidden="true" />;

export function TopicPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categoryName, setCategoryName] = useState('Uncategorized');
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setNotFound(false);
    setError(null);
    setTopic(null);
    setQuestions([]);

    Promise.all([getTopic(slug), listCategories()]).then(([topicResponse, categoriesResponse]) => {
      if (cancelled) return;
      if (!topicResponse.success) {
        if (topicResponse.error.code === 'TOPIC_NOT_FOUND') {
          setNotFound(true);
        } else {
          setError(topicResponse.error.message);
        }
        setIsLoading(false);
        return;
      }

      const loadedTopic = topicResponse.data.topic;
      setTopic(loadedTopic);
      setQuestions(topicResponse.data.questions);
      if (categoriesResponse.success) {
        const category = categoriesResponse.data.categories.find(
          (item) => item.id === loadedTopic.categoryId,
        );
        setCategoryName(category?.name ?? 'Uncategorized');
      } else {
        setCategoryName('Uncategorized');
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <PageShell>
        <div
          className="mx-auto max-w-content px-6 py-16 md:py-24"
          role="status"
          aria-live="polite"
          data-testid="topic-loading"
        >
          <div className="animate-pulse space-y-6">
            <div className="h-4 w-28 rounded bg-tint" />
            <div className="h-10 w-3/4 rounded bg-tint" />
            <div className="h-6 w-full max-w-xl rounded bg-tint" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded bg-tint" />
              <div className="h-6 w-20 rounded bg-tint" />
            </div>
            <div className="mt-12 h-32 w-full rounded-xl border border-line bg-tint/30" />
          </div>
          <span className="sr-only">Loading topic...</span>
        </div>
      </PageShell>
    );
  }

  if (notFound) return <NotFoundPage message="Topic not found." />;

  if (error) {
    return (
      <PageShell>
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          <div
            role="alert"
            data-testid="topic-error"
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
          >
            {error}
          </div>
        </div>
      </PageShell>
    );
  }

  if (!topic) return <NotFoundPage message="Topic not found." />;

  const archived = topic.status === 'archived';
  const canSubmit = !archived && user !== null && user.emailVerified === true;

  return (
    <PageShell>
      <div>
        <section aria-labelledby="topic-heading" className="bg-white">
          <div className="mx-auto max-w-content px-6 py-16 md:py-24">
            <div id="topic-heading">
              <TopicHeader topic={topic} categoryName={categoryName} />
            </div>

            <SourceQuestionCard questions={questions} />

            {canSubmit && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to={`/topics/${topic.slug}/perspectives/new`}
                  className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-secondary"
                >
                  Submit Perspective
                </Link>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="perspectives-heading" className="border-t border-line bg-white">
          <div className="mx-auto max-w-content px-6 py-10">
            <h2
              id="perspectives-heading"
              className="font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
            >
              Perspectives (0)
            </h2>

            <div className="mt-6" aria-live="polite">
              <EmptyState
                icon={icon}
                title="No perspectives yet"
                text="Perspectives for this topic will appear here once they are published."
              />
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default TopicPage;
