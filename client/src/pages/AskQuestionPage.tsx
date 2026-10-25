import { useEffect, useState } from 'react';
import { CheckCircle2, LogIn, X } from 'lucide-react';
import {
  QUESTION_DESCRIPTION_MAX,
  QUESTION_TAGS_MAX,
  QUESTION_TITLE_MAX,
  questionCreateSchema,
} from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button, LinkButton } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { clearDraft, loadDraft, useQuestionDraft, useUnsavedChangesWarning } from '../hooks/useQuestionDraft';
import { createQuestion } from '../api/questions';
import { listCategories, listTags } from '../api/taxonomy';
import type { Category, Question, Tag } from '../api/types';

const input =
  'h-12 w-full rounded-lg border border-line bg-white px-4 text-base text-ink placeholder:text-muted disabled:bg-tint/40';
const label = 'mb-1 block text-sm font-medium text-ink';
const errorText = 'mt-1 text-sm text-ink font-medium';
const counter = 'mt-1 text-right text-xs text-muted';

interface GateProps {
  reason: 'login' | 'verify';
}

function Gate({ reason }: GateProps) {
  return (
    <PageShell>
      <section aria-labelledby="ask-heading" className="bg-white">
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          <p className="text-sm font-medium text-muted">Ask a Question</p>
          <h1
            id="ask-heading"
            className="mt-3 max-w-2xl font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
          >
            {reason === 'login'
              ? 'Log in to ask a question.'
              : 'Verify your email to ask a question.'}
          </h1>
          <p className="mt-4 max-w-2xl text-[20px] text-body">
            {reason === 'login'
              ? 'Only logged-in users with a verified email can submit questions.'
              : 'Check your inbox for the verification link, then come back to submit.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href={reason === 'login' ? '/login' : '/verify-email'}>
              <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
              {reason === 'login' ? 'Log in' : 'Verify email'}
            </LinkButton>
            <LinkButton href="/" variant="outline">
              Back to home
            </LinkButton>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

type Errors = Partial<
  Record<'title' | 'description' | 'category' | 'tags' | 'techStack', string>
>;

const EMPTY_DRAFT = {
  title: '',
  description: '',
  categoryId: '',
  techStack: '',
  tagIds: [] as string[],
};

export function AskQuestionPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [techStack, setTechStack] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<Question | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadDraft();
    if (saved) {
      setTitle(saved.title);
      setDescription(saved.description);
      setCategoryId(saved.categoryId);
      setTechStack(saved.techStack);
      setTagIds(saved.tagIds);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (user === null || user.emailVerified !== true) {
      setTaxonomyLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([listCategories(), listTags()]).then(([categoriesResponse, tagsResponse]) => {
      if (cancelled) return;
      if (!categoriesResponse.success) {
        setTaxonomyError(categoriesResponse.error.message);
        setTaxonomyLoading(false);
        return;
      }
      if (!tagsResponse.success) {
        setTaxonomyError(tagsResponse.error.message);
        setTaxonomyLoading(false);
        return;
      }
      setCategories(categoriesResponse.data.categories);
      setTags(tagsResponse.data.tags);
      setTagIds((prev) =>
        prev.filter((id) => tagsResponse.data.tags.some((tag) => tag.id === id)),
      );
      setTaxonomyLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const draft = hydrated ? { title, description, categoryId, techStack, tagIds } : EMPTY_DRAFT;
  useQuestionDraft(draft);
  const dirty =
    title !== '' ||
    description !== '' ||
    techStack !== '' ||
    tagIds.length > 0 ||
    categoryId !== '';
  useUnsavedChangesWarning(dirty && result === null);

  if (user === null) return <Gate reason="login" />;
  if (user.emailVerified !== true) return <Gate reason="verify" />;

  const selectedTags = tags.filter((tag) => tagIds.includes(tag.id));

  const toggleTag = (tagIdToToggle: string) => {
    setTagIds((prev) => {
      if (prev.includes(tagIdToToggle)) return prev.filter((id) => id !== tagIdToToggle);
      if (prev.length >= QUESTION_TAGS_MAX) return prev;
      return [...prev, tagIdToToggle];
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const parsed = questionCreateSchema.safeParse({
      title,
      description,
      categoryId,
      techStack: techStack.trim() === '' ? undefined : techStack,
      tagIds,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '');
        const key: keyof Errors | null =
          field === 'categoryId'
            ? 'category'
            : field === 'tagIds'
              ? 'tags'
              : field === 'techStack'
                ? 'techStack'
                : field === 'title' || field === 'description'
                  ? field
                  : null;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const response = await createQuestion(parsed.data);
    setSubmitting(false);
    if (response.success) {
      clearDraft();
      setResult(response.data.question);
    } else {
      setSubmitError(response.error.message);
    }
  };

  return (
    <PageShell>
      <section aria-labelledby="ask-form-heading" className="bg-white">
        <div className="mx-auto max-w-content px-6 py-16 md:py-24">
          {result ? (
            <div className="text-center" data-testid="question-submit-success">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
              <h1
                id="ask-form-heading"
                className="mx-auto mt-4 max-w-2xl font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
              >
                Submitted for review
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-[20px] text-body">
                Your question has been queued for review. A moderator will review it before it
                becomes a Topic.
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
                Question ID{' '}
                <span className="font-mono text-base text-ink" data-testid="question-id">
                  {result.id}
                </span>
                <span aria-hidden="true"> · </span>
                Status <span className="font-medium text-ink">Pending</span>
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <LinkButton href="/questions/mine">View my questions</LinkButton>
                <LinkButton href="/topics" variant="outline">
                  Browse topics
                </LinkButton>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-muted">Ask a Question</p>
              <h1
                id="ask-form-heading"
                className="mt-3 max-w-2xl font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
              >
                Submit a question for review
              </h1>
              <p className="mt-4 max-w-2xl text-[20px] text-body">
                A moderator will review it before it becomes a Topic.
              </p>
              <form onSubmit={onSubmit} noValidate className="mt-10 max-w-2xl space-y-6">
                <div aria-live="polite">
                  {submitError && (
                    <p className={errorText} role="alert" data-testid="question-submit-error">
                      {submitError}
                    </p>
                  )}
                  {taxonomyError && (
                    <p className={errorText} role="alert" data-testid="question-taxonomy-error">
                      {taxonomyError}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="q-title" className={label}>
                    Title
                  </label>
                  <input
                    id="q-title"
                    type="text"
                    value={title}
                    maxLength={QUESTION_TITLE_MAX + 20}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? 'q-title-error q-title-count' : 'q-title-count'}
                    placeholder="e.g. How do I handle Redis failover?"
                    className={input}
                    data-testid="question-title-input"
                  />
                  <p id="q-title-count" className={counter}>
                    {title.length} / {QUESTION_TITLE_MAX}
                  </p>
                  {errors.title && (
                    <p
                      id="q-title-error"
                      role="alert"
                      className={errorText}
                      data-testid="question-title-error"
                    >
                      {errors.title}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="q-description" className={label}>
                    Problem Description
                  </label>
                  <textarea
                    id="q-description"
                    value={description}
                    rows={6}
                    onChange={(e) => setDescription(e.target.value)}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description
                        ? 'q-description-error q-description-count'
                        : 'q-description-count'
                    }
                    placeholder="Describe the problem, what you tried, and what happened."
                    className="w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted"
                    data-testid="question-description-input"
                  />
                  <p id="q-description-count" className={counter}>
                    {description.length} / {QUESTION_DESCRIPTION_MAX}
                  </p>
                  {errors.description && (
                    <p
                      id="q-description-error"
                      role="alert"
                      className={errorText}
                      data-testid="question-description-error"
                    >
                      {errors.description}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="q-category" className={label}>
                    Category
                  </label>
                  <select
                    id="q-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={errors.category ? 'q-category-error' : undefined}
                    disabled={taxonomyLoading || Boolean(taxonomyError)}
                    className="h-12 w-full rounded-lg border border-line bg-white px-4 text-base text-ink disabled:bg-tint/40"
                    data-testid="question-category-select"
                  >
                    <option value="">
                      {taxonomyLoading ? 'Loading categories...' : 'Select a category'}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p
                      id="q-category-error"
                      role="alert"
                      className={errorText}
                      data-testid="question-category-error"
                    >
                      {errors.category}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="q-techstack" className={label}>
                    Programming Language / Tech Stack{' '}
                    <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <input
                    id="q-techstack"
                    type="text"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    placeholder="e.g. TypeScript, Redis 7"
                    className={input}
                    data-testid="question-techstack-input"
                  />
                  {errors.techStack && (
                    <p role="alert" className={errorText} data-testid="question-techstack-error">
                      {errors.techStack}
                    </p>
                  )}
                </div>
                <fieldset>
                  <legend className="text-sm font-medium text-ink">
                    Tags{' '}
                    <span className="font-normal text-muted">
                      (pick up to {QUESTION_TAGS_MAX})
                    </span>
                  </legend>
                  {selectedTags.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected tags">
                      {selectedTags.map((tag) => (
                        <li
                          key={tag.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-tint px-2.5 py-1 text-sm text-secondary"
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            aria-label={`Remove tag: ${tag.name}`}
                            data-testid={`question-tag-remove-${tag.name}`}
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-secondary hover:text-black"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Available tags">
                    {taxonomyLoading ? (
                      <span className="text-sm text-muted">Loading tags...</span>
                    ) : (
                      tags
                        .filter((tag) => !tagIds.includes(tag.id))
                        .map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            disabled={tagIds.length >= QUESTION_TAGS_MAX}
                            onClick={() => toggleTag(tag.id)}
                            data-testid={`question-tag-${tag.name}`}
                            className="rounded-lg border border-line bg-white px-2.5 py-1 text-sm text-secondary hover:bg-tint disabled:opacity-40"
                          >
                            {tag.name}
                          </button>
                        ))
                    )}
                  </div>
                  {errors.tags && (
                    <p role="alert" className={errorText} data-testid="question-tags-error">
                      {errors.tags}
                    </p>
                  )}
                </fieldset>
                <Button
                  type="submit"
                  disabled={submitting || taxonomyLoading || Boolean(taxonomyError)}
                  aria-busy={submitting}
                  data-testid="question-submit-button"
                >
                  {submitting ? 'Submitting…' : 'Submit question'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export default AskQuestionPage;
