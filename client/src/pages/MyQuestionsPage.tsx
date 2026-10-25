import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Edit2, HelpCircle, Trash2, XCircle } from 'lucide-react';
import { QUESTION_TAGS_MAX, questionUpdateSchema } from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button, LinkButton } from '../components/ui/Button';
import { deleteQuestion, listMyQuestions, updateQuestion } from '../api/questions';
import { listCategories, listTags } from '../api/taxonomy';
import type { Category, Question, Tag } from '../api/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_LABEL: Record<Question['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_CLASS: Record<Question['status'], string> = {
  pending: 'bg-amber-50 text-amber-800 border border-amber-200',
  approved: 'bg-green-50 text-green-800 border border-green-200',
  rejected: 'bg-red-50 text-red-800 border border-red-200',
};

type EditErrors = Partial<Record<'title' | 'description' | 'category' | 'tags', string>>;

export function MyQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editTagsTouched, setEditTagsTouched] = useState(false);
  const [editErrors, setEditErrors] = useState<EditErrors>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listMyQuestions(), listCategories(), listTags()]).then(
      ([questionsResponse, categoriesResponse, tagsResponse]) => {
        if (cancelled) return;
        if (!questionsResponse.success) {
          setLoadError(questionsResponse.error.message);
          setIsLoading(false);
          return;
        }
        setQuestions(questionsResponse.data.questions);
        if (categoriesResponse.success) setCategories(categoriesResponse.data.categories);
        else setActionError(categoriesResponse.error.message);
        if (tagsResponse.success) setTags(tagsResponse.data.tags);
        else setActionError(tagsResponse.error.message);
        setIsLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  const startEdit = (question: Question) => {
    setEditingId(question.id);
    setEditTitle(question.title);
    setEditDescription(question.description);
    setEditCategoryId(question.categoryId);
    setEditTagIds(
      tags.filter((tag) => question.tags.includes(tag.name)).map((tag) => tag.id),
    );
    setEditTagsTouched(false);
    setEditErrors({});
    setActionError(null);
    setMessage(null);
  };

  const toggleEditTag = (tagId: string) => {
    setEditTagsTouched(true);
    setEditTagIds((prev) => {
      if (prev.includes(tagId)) return prev.filter((id) => id !== tagId);
      if (prev.length >= QUESTION_TAGS_MAX) return prev;
      return [...prev, tagId];
    });
  };

  const saveEdit = async (question: Question) => {
    setActionError(null);
    setMessage(null);
    const parsed = questionUpdateSchema.safeParse({
      title: editTitle,
      description: editDescription,
      categoryId: editCategoryId,
      ...(editTagsTouched ? { tagIds: editTagIds } : {}),
    });
    if (!parsed.success) {
      const next: EditErrors = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '');
        const key: keyof EditErrors | null =
          field === 'categoryId'
            ? 'category'
            : field === 'tagIds'
              ? 'tags'
              : field === 'title' || field === 'description'
                ? field
                : null;
        if (key && !next[key]) next[key] = issue.message;
      }
      setEditErrors(next);
      return;
    }
    setEditErrors({});
    setSaving(true);
    const response = await updateQuestion(question.id, parsed.data);
    setSaving(false);
    if (response.success) {
      setQuestions((prev) =>
        prev.map((item) => (item.id === question.id ? response.data.question : item)),
      );
      setEditingId(null);
      setMessage('Question updated.');
    } else {
      setActionError(response.error.message);
    }
  };

  const removeQuestion = async (question: Question) => {
    setActionError(null);
    setMessage(null);
    setDeletingId(question.id);
    const response = await deleteQuestion(question.id);
    setDeletingId(null);
    if (response.success) {
      setQuestions((prev) => prev.filter((item) => item.id !== question.id));
      if (editingId === question.id) setEditingId(null);
      setMessage(`Question "${question.title}" deleted.`);
    } else {
      setActionError(response.error.message);
    }
  };

  return (
    <PageShell>
      <div className="pb-28">
        <section aria-labelledby="my-questions-heading" className="bg-white border-b border-line">
          <div className="mx-auto max-w-content px-6 py-12 md:py-16">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted">My Questions</p>
                <h1
                  id="my-questions-heading"
                  className="mt-2 font-serif text-[30px] leading-[1.2] text-ink md:text-[40px]"
                >
                  Your submitted questions
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-body">
                  Track review status, fix pending questions, and remove submissions you no longer
                  need.
                </p>
              </div>
              <LinkButton href="/questions/new">Ask a Question</LinkButton>
            </div>
          </div>
        </section>

        <section className="bg-canvas">
          <div className="mx-auto max-w-content px-6 py-10">
            {message && (
              <div
                role="status"
                data-testid="my-question-success"
                className="mb-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900"
              >
                {message}
              </div>
            )}
            {actionError && (
              <div
                role="alert"
                data-testid="my-question-error"
                className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
              >
                {actionError}
              </div>
            )}

            {isLoading ? (
              <div
                className="animate-pulse space-y-3"
                role="status"
                aria-live="polite"
                data-testid="my-questions-loading"
              >
                <div className="h-24 w-full rounded-xl border border-line bg-white" />
                <div className="h-24 w-full rounded-xl border border-line bg-white" />
                <span className="sr-only">Loading your questions...</span>
              </div>
            ) : loadError ? (
              <div
                role="alert"
                data-testid="my-questions-load-error"
                className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
              >
                {loadError}
              </div>
            ) : questions.length === 0 ? (
              <div
                data-testid="my-questions-empty"
                className="rounded-xl border border-line bg-white p-10 text-center"
              >
                <HelpCircle className="mx-auto h-10 w-10 text-deco" aria-hidden="true" />
                <h2 className="mt-4 font-serif text-lg font-semibold text-ink">
                  No questions yet
                </h2>
                <p className="mt-1 text-sm text-body">
                  You haven&apos;t asked any technical questions yet.
                </p>
                <div className="mt-6">
                  <LinkButton href="/questions/new">Ask a Question</LinkButton>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {questions.map((question) => {
                  const isPending = question.status === 'pending';
                  return (
                    <li
                      key={question.id}
                      data-testid="my-question-item"
                      className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    >
                      {editingId === question.id ? (
                        <div className="space-y-4" data-testid="my-question-edit-form">
                          <div>
                            <label
                              htmlFor={`edit-title-${question.id}`}
                              className="mb-1 block text-sm font-medium text-ink"
                            >
                              Title
                            </label>
                            <input
                              id={`edit-title-${question.id}`}
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-10 w-full rounded-lg border border-line px-3 text-sm text-ink"
                              data-testid="my-question-edit-title-input"
                            />
                            {editErrors.title && (
                              <p
                                role="alert"
                                data-testid="my-question-edit-title-error"
                                className="mt-1 text-sm font-medium text-ink"
                              >
                                {editErrors.title}
                              </p>
                            )}
                          </div>
                          <div>
                            <label
                              htmlFor={`edit-description-${question.id}`}
                              className="mb-1 block text-sm font-medium text-ink"
                            >
                              Description
                            </label>
                            <textarea
                              id={`edit-description-${question.id}`}
                              rows={5}
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
                              data-testid="my-question-edit-description-input"
                            />
                            {editErrors.description && (
                              <p
                                role="alert"
                                data-testid="my-question-edit-description-error"
                                className="mt-1 text-sm font-medium text-ink"
                              >
                                {editErrors.description}
                              </p>
                            )}
                          </div>
                          <div>
                            <label
                              htmlFor={`edit-category-${question.id}`}
                              className="mb-1 block text-sm font-medium text-ink"
                            >
                              Category
                            </label>
                            <select
                              id={`edit-category-${question.id}`}
                              value={editCategoryId}
                              onChange={(e) => setEditCategoryId(e.target.value)}
                              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink"
                              data-testid="my-question-edit-category-select"
                            >
                              <option value="">Select a category</option>
                              {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            {editErrors.category && (
                              <p
                                role="alert"
                                data-testid="my-question-edit-category-error"
                                className="mt-1 text-sm font-medium text-ink"
                              >
                                {editErrors.category}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="mb-2 text-sm font-medium text-ink">
                              Tags{' '}
                              <span className="font-normal text-muted">
                                (pick up to {QUESTION_TAGS_MAX})
                              </span>
                            </p>
                            <div className="flex flex-wrap gap-2" role="group" aria-label="Tags">
                              {tags.map((tag) => {
                                const selected = editTagIds.includes(tag.id);
                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    aria-pressed={selected}
                                    disabled={!selected && editTagIds.length >= QUESTION_TAGS_MAX}
                                    onClick={() => toggleEditTag(tag.id)}
                                    data-testid={`my-question-edit-tag-${tag.name}`}
                                    className={`rounded-lg border px-2.5 py-1 text-sm ${
                                      selected
                                        ? 'border-black bg-black text-white'
                                        : 'border-line bg-white text-secondary hover:bg-tint'
                                    } disabled:opacity-40`}
                                  >
                                    {tag.name}
                                  </button>
                                );
                              })}
                            </div>
                            {editErrors.tags && (
                              <p
                                role="alert"
                                data-testid="my-question-edit-tags-error"
                                className="mt-1 text-sm font-medium text-ink"
                              >
                                {editErrors.tags}
                              </p>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setEditingId(null)}
                              className="py-1 px-3 text-xs"
                              data-testid="my-question-edit-cancel-button"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => saveEdit(question)}
                              disabled={saving}
                              className="py-1 px-3 text-xs"
                              data-testid="my-question-edit-save-button"
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span
                                data-testid="question-status-badge"
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[question.status]}`}
                              >
                                {question.status === 'pending' && <Clock className="h-3 w-3" />}
                                {question.status === 'approved' && (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                {question.status === 'rejected' && <XCircle className="h-3 w-3" />}
                                {STATUS_LABEL[question.status]}
                              </span>
                              <time dateTime={question.createdAt} className="text-xs text-muted">
                                {formatDate(question.createdAt)}
                              </time>
                              <span className="rounded-md border border-line bg-tint px-2 py-0.5 text-xs font-semibold text-ink">
                                {categoryNames.get(question.categoryId) ?? 'Uncategorized'}
                              </span>
                            </div>
                            <p className="text-base font-semibold text-ink">{question.title}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-body">
                              {question.description}
                            </p>
                            {question.tags.length > 0 && (
                              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tags">
                                {question.tags.map((tag) => (
                                  <li
                                    key={tag}
                                    className="rounded-md bg-tint px-2 py-0.5 text-xs text-body"
                                  >
                                    {tag}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {question.status === 'rejected' && question.rejectionReason && (
                              <p
                                data-testid="question-rejection-reason"
                                className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                              >
                                Rejection reason: {question.rejectionReason}
                              </p>
                            )}
                          </div>

                          {isPending && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEdit(question)}
                                data-testid={`my-question-edit-button-${question.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-secondary hover:bg-tint"
                              >
                                <Edit2 className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeQuestion(question)}
                                disabled={deletingId === question.id}
                                data-testid={`my-question-delete-button-${question.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingId === question.id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default MyQuestionsPage;
