import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  Link2,
  Tag as TagIcon,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  QUESTION_TAGS_MAX,
  questionApproveSchema,
  questionRejectSchema,
} from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { approveQuestion, listPendingQuestions, rejectQuestion } from '../api/questions';
import { listCategories, listTags } from '../api/taxonomy';
import { listTopics } from '../api/topics';
import type { Category, Question, Tag, Topic } from '../api/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type ActionModalType = 'reject' | 'link_topic' | 'create_topic' | null;

export function QuestionReviewQueuePage() {
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<ActionModalType>(null);
  const [modalQuestion, setModalQuestion] = useState<Question | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const [selectedTopicId, setSelectedTopicId] = useState('');

  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [newTopicCategoryId, setNewTopicCategoryId] = useState('');
  const [newTopicTags, setNewTopicTags] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([listPendingQuestions(), listCategories(), listTags(), listTopics()]).then(
      ([questionsResponse, categoriesResponse, tagsResponse, topicsResponse]) => {
        if (cancelled) return;
        if (!questionsResponse.success) {
          setLoadError(questionsResponse.error.message);
          setIsLoading(false);
          return;
        }
        setPendingQuestions(questionsResponse.data.questions);
        setSelectedId(questionsResponse.data.questions[0]?.id ?? null);

        if (categoriesResponse.success) setCategories(categoriesResponse.data.categories);
        else setLookupError(categoriesResponse.error.message);
        if (tagsResponse.success) setTags(tagsResponse.data.tags);
        else setLookupError(tagsResponse.error.message);
        if (topicsResponse.success) setTopics(topicsResponse.data.topics);
        else setLookupError(topicsResponse.error.message);

        setIsLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const selectedQuestion =
    pendingQuestions.find((question) => question.id === selectedId) ?? null;

  const closeModal = () => {
    setActiveModal(null);
    setModalQuestion(null);
    setShowRejectConfirm(false);
    setActionError(null);
    setActionLoading(false);
  };

  const removeQuestionAndNotify = (questionId: string, message: string) => {
    const remaining = pendingQuestions.filter((question) => question.id !== questionId);
    setPendingQuestions(remaining);
    if (selectedId === questionId) setSelectedId(remaining[0]?.id ?? null);
    setSuccessBanner(message);
    closeModal();
  };

  const handleOpenReject = (question: Question) => {
    setModalQuestion(question);
    setRejectReason('');
    setRejectError('');
    setShowRejectConfirm(false);
    setActionError(null);
    setActiveModal('reject');
  };

  const handleOpenLinkTopic = (question: Question) => {
    setModalQuestion(question);
    setSelectedTopicId(topics[0]?.id ?? '');
    setActionError(null);
    setActiveModal('link_topic');
  };

  const handleOpenCreateTopic = (question: Question) => {
    setModalQuestion(question);
    setNewTopicTitle(question.title);
    setNewTopicDescription(question.description);
    setNewTopicCategoryId(question.categoryId);
    setNewTopicTags(question.tags.join(', '));
    setActionError(null);
    setActiveModal('create_topic');
  };

  const handleConfirmReject = async () => {
    if (!modalQuestion) return;
    if (!showRejectConfirm) {
      const parsed = questionRejectSchema.safeParse({ reason: rejectReason });
      if (!parsed.success) {
        setRejectError(parsed.error.issues[0]?.message ?? 'A rejection reason is required.');
        return;
      }
      setRejectError('');
      setShowRejectConfirm(true);
      return;
    }

    setActionLoading(true);
    setActionError(null);
    const response = await rejectQuestion(modalQuestion.id, { reason: rejectReason.trim() });
    setActionLoading(false);
    if (response.success) {
      removeQuestionAndNotify(
        modalQuestion.id,
        `Question "${modalQuestion.title}" was rejected. Reason: "${rejectReason.trim()}"`,
      );
    } else {
      setActionError(response.error.message);
    }
  };

  const handleConfirmLinkTopic = async () => {
    if (!modalQuestion) return;
    const topic = topics.find((item) => item.id === selectedTopicId);
    if (!topic) {
      setActionError('Select a topic to link this question to.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    const response = await approveQuestion(modalQuestion.id, { linkTopicId: topic.id });
    setActionLoading(false);
    if (response.success) {
      removeQuestionAndNotify(
        modalQuestion.id,
        `Question "${modalQuestion.title}" approved and linked to topic "${response.data.topic.title}".`,
      );
    } else {
      setActionError(response.error.message);
    }
  };

  const handleConfirmCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalQuestion) return;

    const requestedNames = newTopicTags
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const uniqueNames = Array.from(new Set(requestedNames.map((name) => name.toLowerCase())));
    if (uniqueNames.length > QUESTION_TAGS_MAX) {
      setActionError(`Pick up to ${QUESTION_TAGS_MAX} tags.`);
      return;
    }
    const tagIdByName = new Map(tags.map((tag) => [tag.name.toLowerCase(), tag.id]));
    const tagIds: string[] = [];
    const unknown: string[] = [];
    for (const name of uniqueNames) {
      const found = tagIdByName.get(name);
      if (found) tagIds.push(found);
      else unknown.push(name);
    }
    if (unknown.length > 0) {
      setActionError(`Unknown tag${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}.`);
      return;
    }

    const parsed = questionApproveSchema.safeParse({
      createTopic: {
        title: newTopicTitle,
        description: newTopicDescription,
        categoryId: newTopicCategoryId,
        tagIds,
      },
    });
    if (!parsed.success) {
      setActionError(parsed.error.issues[0]?.message ?? 'Check the topic details.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    const response = await approveQuestion(modalQuestion.id, parsed.data);
    setActionLoading(false);
    if (response.success) {
      removeQuestionAndNotify(
        modalQuestion.id,
        `Question approved and new topic "${response.data.topic.title}" created.`,
      );
    } else {
      setActionError(response.error.message);
    }
  };

  return (
    <PageShell>
      <div className="pb-28">
        <section aria-labelledby="queue-heading" className="bg-white border-b border-line">
          <div className="mx-auto max-w-content px-6 py-10 md:py-14">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300">
                    Admin Moderation
                  </span>
                  <span className="text-xs text-muted">Review Queue</span>
                </div>
                <h1
                  id="queue-heading"
                  className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[36px]"
                >
                  Question Review Queue
                </h1>
                <p className="mt-2 text-sm text-body">
                  Review submitted technical questions. Reject with feedback, link to an existing
                  topic, or generate a new topic.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-tint/40 px-5 py-3 text-right">
                <span className="text-xs font-semibold uppercase text-muted tracking-wider">
                  Pending Review
                </span>
                <p className="text-2xl font-serif font-bold text-ink" data-testid="review-count">
                  {pendingQuestions.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-canvas min-h-[500px]">
          <div className="mx-auto max-w-content px-6 py-8">
            {successBanner && (
              <div
                data-testid="review-success"
                className="mb-6 flex items-center justify-between rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <span>{successBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessBanner(null)}
                  className="rounded-lg p-1 text-green-700 hover:bg-green-100"
                  aria-label="Dismiss message"
                  data-testid="review-success-dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {lookupError && (
              <div
                role="alert"
                data-testid="review-lookup-error"
                className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900"
              >
                Some review options could not load: {lookupError}
              </div>
            )}

            {isLoading ? (
              <div
                className="animate-pulse space-y-3"
                role="status"
                aria-live="polite"
                data-testid="review-loading"
              >
                <div className="h-20 w-full rounded-xl border border-line bg-white" />
                <div className="h-20 w-full rounded-xl border border-line bg-white" />
                <span className="sr-only">Loading review queue...</span>
              </div>
            ) : loadError ? (
              <div
                role="alert"
                data-testid="review-error"
                className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
              >
                {loadError}
              </div>
            ) : pendingQuestions.length === 0 ? (
              <div
                data-testid="review-empty"
                className="rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
                <h2 className="mt-4 font-serif text-xl font-semibold text-ink">
                  Review Queue Clear!
                </h2>
                <p className="mt-2 text-sm text-muted max-w-md mx-auto">
                  All submitted technical questions have been reviewed and processed. New user
                  questions will appear here for review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted px-1">
                    Pending Questions ({pendingQuestions.length})
                  </h2>
                  <div className="space-y-3">
                    {pendingQuestions.map((question) => {
                      const isSelected = selectedId === question.id;
                      return (
                        <div
                          key={question.id}
                          data-testid="review-item"
                          onClick={() => setSelectedId(question.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedId(question.id);
                            }
                          }}
                          className={`rounded-xl border p-5 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-black bg-white shadow-md ring-1 ring-black'
                              : 'border-line bg-white hover:border-black/30 hover:bg-tint/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-tint px-2 py-0.5 text-xs font-semibold text-ink border border-line">
                              {categoryNames.get(question.categoryId) ?? 'Uncategorized'}
                            </span>
                            <span className="text-xs text-muted">
                              {formatDate(question.createdAt)}
                            </span>
                          </div>

                          <h3 className="font-semibold text-ink text-base line-clamp-2">
                            {question.title}
                          </h3>

                          <p className="mt-2 text-xs text-body line-clamp-2">
                            {question.description}
                          </p>

                          <div className="mt-3 flex items-center justify-between text-xs text-muted pt-2 border-t border-line/50">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> @{question.authorUsername ?? 'unknown'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-7 sticky top-24">
                  {selectedQuestion ? (
                    <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            Status: Pending
                          </span>
                          <span className="rounded-md bg-tint px-2 py-0.5 text-xs font-semibold text-ink border border-line">
                            {categoryNames.get(selectedQuestion.categoryId) ?? 'Uncategorized'}
                          </span>
                        </div>
                        <span className="text-xs text-muted">
                          Submitted on {formatDate(selectedQuestion.createdAt)} by{' '}
                          <strong className="text-ink">
                            @{selectedQuestion.authorUsername ?? 'unknown'}
                          </strong>
                        </span>
                      </div>

                      <div>
                        <h2 className="font-serif text-xl font-bold text-ink">
                          {selectedQuestion.title}
                        </h2>
                        <div className="mt-4 text-sm text-body leading-relaxed whitespace-pre-line bg-tint/20 rounded-lg p-4 border border-line/60">
                          {selectedQuestion.description}
                        </div>
                      </div>

                      {selectedQuestion.tags.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-muted tracking-wider flex items-center gap-1 mb-2">
                            <TagIcon className="h-3 w-3" /> Tags
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedQuestion.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-tint px-2.5 py-1 text-xs font-medium text-ink border border-line"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-line space-y-3">
                        <h4 className="text-xs font-semibold uppercase text-muted tracking-wider">
                          Moderation Actions
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenReject(selectedQuestion)}
                            data-testid="review-reject-button"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="h-4 w-4" /> Reject Question
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenLinkTopic(selectedQuestion)}
                            data-testid="review-approve-link-button"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-tint transition-colors"
                          >
                            <Link2 className="h-4 w-4 text-secondary" /> Approve &amp; Link Topic
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCreateTopic(selectedQuestion)}
                            data-testid="review-approve-create-button"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-secondary transition-colors"
                          >
                            <FolderPlus className="h-4 w-4" /> Approve &amp; Create Topic
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-line bg-white p-8 text-center text-muted">
                      Select a question from the left queue to view details and perform moderation
                      actions.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {activeModal === 'reject' && modalQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  <h3 className="font-serif text-lg font-bold">Reject Question</h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  data-testid="review-reject-close"
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-sm font-semibold text-ink">{modalQuestion.title}</p>

                <div>
                  <label
                    htmlFor="reject-reason"
                    className="block text-xs font-semibold text-ink mb-1"
                  >
                    Reason for Rejection <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="reject-reason"
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      setShowRejectConfirm(false);
                      if (rejectError) setRejectError('');
                    }}
                    placeholder="Provide detailed feedback on why this question was rejected (e.g. duplicate, off-topic, insufficient detail)..."
                    className="w-full rounded-lg border border-line p-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-black"
                    data-testid="review-reject-reason-input"
                  />
                  {rejectError && (
                    <p
                      data-testid="review-reject-error"
                      className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3" /> {rejectError}
                    </p>
                  )}
                </div>

                {showRejectConfirm && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                    <span>
                      Are you sure you want to reject this question? This action will notify the
                      submitter.
                    </span>
                  </div>
                )}

                {actionError && (
                  <div
                    role="alert"
                    data-testid="review-action-error"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
                  >
                    {actionError}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="py-2 text-xs"
                  data-testid="review-reject-cancel"
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionLoading}
                  data-testid="review-reject-confirm-button"
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading
                    ? 'Rejecting…'
                    : showRejectConfirm
                      ? 'Confirm Rejection'
                      : 'Reject Question'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'link_topic' && modalQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2 text-ink">
                  <Link2 className="h-5 w-5" />
                  <h3 className="font-serif text-lg font-bold">
                    Approve &amp; Link to Existing Topic
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  data-testid="review-link-close"
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-muted">Selected Question:</p>
                  <p className="text-sm font-semibold text-ink mt-0.5">{modalQuestion.title}</p>
                </div>

                <div>
                  <label
                    htmlFor="select-topic"
                    className="block text-xs font-semibold text-ink mb-1"
                  >
                    Select Target Topic
                  </label>
                  <select
                    id="select-topic"
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="w-full rounded-lg border border-line bg-white p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                    data-testid="review-link-topic-select"
                  >
                    {topics.length === 0 ? (
                      <option value="">No topics available</option>
                    ) : (
                      topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          [{categoryNames.get(topic.categoryId) ?? 'Uncategorized'}] {topic.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {actionError && (
                  <div
                    role="alert"
                    data-testid="review-action-error"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
                  >
                    {actionError}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="py-2 text-xs"
                  data-testid="review-link-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmLinkTopic}
                  disabled={actionLoading || topics.length === 0}
                  className="py-2 text-xs"
                  data-testid="review-link-confirm-button"
                >
                  {actionLoading ? 'Approving…' : 'Approve & Link'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'create_topic' && modalQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="w-full max-w-xl rounded-xl border border-line bg-white p-6 shadow-xl my-8">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2 text-ink">
                  <FolderPlus className="h-5 w-5" />
                  <h3 className="font-serif text-lg font-bold">Approve &amp; Create New Topic</h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  data-testid="review-create-close"
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmCreateTopic} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="topic-title"
                    className="block text-xs font-semibold text-ink mb-1"
                  >
                    Topic Title
                  </label>
                  <input
                    id="topic-title"
                    type="text"
                    required
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className="w-full rounded-lg border border-line p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                    data-testid="review-create-topic-title-input"
                  />
                </div>

                <div>
                  <label htmlFor="topic-desc" className="block text-xs font-semibold text-ink mb-1">
                    Description
                  </label>
                  <textarea
                    id="topic-desc"
                    rows={3}
                    required
                    value={newTopicDescription}
                    onChange={(e) => setNewTopicDescription(e.target.value)}
                    className="w-full rounded-lg border border-line p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                    data-testid="review-create-topic-description-input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="topic-category"
                      className="block text-xs font-semibold text-ink mb-1"
                    >
                      Category
                    </label>
                    <select
                      id="topic-category"
                      value={newTopicCategoryId}
                      onChange={(e) => setNewTopicCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                      data-testid="review-create-topic-category-select"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="topic-tags"
                      className="block text-xs font-semibold text-ink mb-1"
                    >
                      Tags (comma separated)
                    </label>
                    <input
                      id="topic-tags"
                      type="text"
                      value={newTopicTags}
                      onChange={(e) => setNewTopicTags(e.target.value)}
                      list="review-tag-options"
                      className="w-full rounded-lg border border-line p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                      data-testid="review-create-topic-tags-input"
                    />
                    <datalist id="review-tag-options">
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {actionError && (
                  <div
                    role="alert"
                    data-testid="review-action-error"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
                  >
                    {actionError}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-line">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={closeModal}
                    className="py-2 text-xs"
                    data-testid="review-create-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="py-2 text-xs"
                    data-testid="review-create-topic-submit-button"
                  >
                    {actionLoading ? 'Creating…' : 'Create Topic & Approve'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default QuestionReviewQueuePage;
