import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderPlus,
  Link2,
  Paperclip,
  Tag,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { INITIAL_PENDING_QUESTIONS, type PendingQuestion } from '../data/mockQuestions';
import { SEARCH_CATEGORIES, SEARCH_TOPICS } from '../data/mockTopics';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type ActionModalType = 'reject' | 'link_topic' | 'create_topic' | null;

export function QuestionReviewQueuePage() {
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>(INITIAL_PENDING_QUESTIONS);
  const [selectedQuestion, setSelectedQuestion] = useState<PendingQuestion | null>(INITIAL_PENDING_QUESTIONS[0] || null);

  // Active Action Modal
  const [activeModal, setActiveModal] = useState<ActionModalType>(null);
  const [modalQuestion, setModalQuestion] = useState<PendingQuestion | null>(null);

  // Reject State
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  // Link Topic State
  const [selectedTopicSlug, setSelectedTopicSlug] = useState(SEARCH_TOPICS[0]?.slug || '');

  // Create Topic Form State
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [newTopicCategory, setNewTopicCategory] = useState('');
  const [newTopicTags, setNewTopicTags] = useState('');

  // Toast / Banner state
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Open modal handlers
  const handleOpenReject = (q: PendingQuestion) => {
    setModalQuestion(q);
    setRejectReason('');
    setRejectError('');
    setShowRejectConfirm(false);
    setActiveModal('reject');
  };

  const handleOpenLinkTopic = (q: PendingQuestion) => {
    setModalQuestion(q);
    setSelectedTopicSlug(SEARCH_TOPICS[0]?.slug || '');
    setActiveModal('link_topic');
  };

  const handleOpenCreateTopic = (q: PendingQuestion) => {
    setModalQuestion(q);
    setNewTopicTitle(q.title);
    setNewTopicDescription(q.description);
    setNewTopicCategory(q.category);
    setNewTopicTags(q.tags.join(', '));
    setActiveModal('create_topic');
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalQuestion(null);
    setShowRejectConfirm(false);
  };

  const removeQuestionAndNotify = (qId: string, message: string) => {
    setPendingQuestions((prev) => {
      const updated = prev.filter((item) => item.id !== qId);
      if (selectedQuestion?.id === qId) {
        setSelectedQuestion(updated[0] || null);
      }
      return updated;
    });
    setSuccessBanner(message);
    closeModal();
  };

  // Submit Reject
  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setRejectError('Rejection reason is required.');
      return;
    }
    if (!showRejectConfirm) {
      setShowRejectConfirm(true);
      return;
    }
    if (modalQuestion) {
      removeQuestionAndNotify(
        modalQuestion.id,
        `Question "${modalQuestion.title}" was rejected. Reason: "${rejectReason.trim()}"`,
      );
    }
  };

  // Submit Link to Existing Topic
  const handleConfirmLinkTopic = () => {
    const topic = SEARCH_TOPICS.find((t) => t.slug === selectedTopicSlug);
    if (modalQuestion && topic) {
      removeQuestionAndNotify(
        modalQuestion.id,
        `Question "${modalQuestion.title}" approved and linked to topic "${topic.title}".`,
      );
    }
  };

  // Submit Create New Topic
  const handleConfirmCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;
    if (modalQuestion) {
      removeQuestionAndNotify(
        modalQuestion.id,
        `Question approved and new topic "${newTopicTitle.trim()}" created successfully.`,
      );
    }
  };

  return (
    <PageShell>
      <div className="pb-28">
        {/* Header */}
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
                  Review submitted technical questions. Reject with feedback, link to an existing topic, or generate a new topic.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-tint/40 px-5 py-3 text-right">
                <span className="text-xs font-semibold uppercase text-muted tracking-wider">
                  Pending Review
                </span>
                <p className="text-2xl font-serif font-bold text-ink">
                  {pendingQuestions.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="bg-canvas min-h-[500px]">
          <div className="mx-auto max-w-content px-6 py-8">
            {/* Success Toast Banner */}
            {successBanner && (
              <div className="mb-6 flex items-center justify-between rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 shadow-xs">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <span>{successBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessBanner(null)}
                  className="rounded-lg p-1 text-green-700 hover:bg-green-100"
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {pendingQuestions.length === 0 ? (
              /* Empty State */
              <div className="rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
                <h2 className="mt-4 font-serif text-xl font-semibold text-ink">
                  Review Queue Clear!
                </h2>
                <p className="mt-2 text-sm text-muted max-w-md mx-auto">
                  All submitted technical questions have been reviewed and processed. New user questions will appear here for review.
                </p>
              </div>
            ) : (
              /* Split View: List on left, detail on right */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left side: List of Pending Questions (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted px-1">
                    Pending Questions ({pendingQuestions.length})
                  </h2>
                  <div className="space-y-3">
                    {pendingQuestions.map((q) => {
                      const isSelected = selectedQuestion?.id === q.id;
                      return (
                        <div
                          key={q.id}
                          onClick={() => setSelectedQuestion(q)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedQuestion(q);
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
                              {q.category}
                            </span>
                            <span className="text-xs text-muted">{formatDate(q.submittedDate)}</span>
                          </div>

                          <h3 className="font-semibold text-ink text-base line-clamp-2">
                            {q.title}
                          </h3>

                          <p className="mt-2 text-xs text-body line-clamp-2">
                            {q.description}
                          </p>

                          <div className="mt-3 flex items-center justify-between text-xs text-muted pt-2 border-t border-line/50">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> @{q.submitterName}
                            </span>
                            {q.attachments.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Paperclip className="h-3 w-3" /> {q.attachments.length} attachment(s)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right side: Selected Question Detail & Actions (7 cols) */}
                <div className="lg:col-span-7 sticky top-24">
                  {selectedQuestion ? (
                    <div className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-6">
                      {/* Top status & metadata */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                            Status: Pending
                          </span>
                          <span className="rounded-md bg-tint px-2 py-0.5 text-xs font-semibold text-ink border border-line">
                            {selectedQuestion.category}
                          </span>
                        </div>
                        <span className="text-xs text-muted">
                          Submitted on {formatDate(selectedQuestion.submittedDate)} by{' '}
                          <strong className="text-ink">@{selectedQuestion.submitterName}</strong>
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h2 className="font-serif text-xl font-bold text-ink">
                          {selectedQuestion.title}
                        </h2>
                        <div className="mt-4 text-sm text-body leading-relaxed whitespace-pre-line bg-tint/20 rounded-lg p-4 border border-line/60">
                          {selectedQuestion.description}
                        </div>
                      </div>

                      {/* Tags */}
                      {selectedQuestion.tags.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-muted tracking-wider flex items-center gap-1 mb-2">
                            <Tag className="h-3 w-3" /> Tags
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

                      {/* Attachments */}
                      {selectedQuestion.attachments.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-muted tracking-wider flex items-center gap-1 mb-2">
                            <Paperclip className="h-3 w-3" /> Attachments ({selectedQuestion.attachments.length})
                          </h4>
                          <ul className="space-y-2">
                            {selectedQuestion.attachments.map((att) => (
                              <li
                                key={att.name}
                                className="flex items-center justify-between rounded-lg border border-line bg-white p-2.5 text-xs text-ink"
                              >
                                <span className="flex items-center gap-2 font-medium truncate">
                                  <FileText className="h-4 w-4 text-muted shrink-0" />
                                  {att.name}
                                </span>
                                <span className="text-muted shrink-0">{formatBytes(att.size)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Review Action Buttons Bar */}
                      <div className="pt-4 border-t border-line space-y-3">
                        <h4 className="text-xs font-semibold uppercase text-muted tracking-wider">
                          Moderation Actions
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenReject(selectedQuestion)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="h-4 w-4" /> Reject Question
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenLinkTopic(selectedQuestion)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink hover:bg-tint transition-colors"
                          >
                            <Link2 className="h-4 w-4 text-secondary" /> Approve & Link Topic
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenCreateTopic(selectedQuestion)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-secondary transition-colors"
                          >
                            <FolderPlus className="h-4 w-4" /> Approve & Create Topic
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-line bg-white p-8 text-center text-muted">
                      Select a question from the left queue to view details and perform moderation actions.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* MODAL 1: Reject Question */}
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
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-sm font-semibold text-ink">
                  {modalQuestion.title}
                </p>

                <div>
                  <label htmlFor="reject-reason" className="block text-xs font-semibold text-ink mb-1">
                    Reason for Rejection <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="reject-reason"
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (rejectError) setRejectError('');
                    }}
                    placeholder="Provide detailed feedback on why this question was rejected (e.g. duplicate, off-topic, insufficient detail)..."
                    className="w-full rounded-lg border border-line p-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  {rejectError && (
                    <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {rejectError}
                    </p>
                  )}
                </div>

                {showRejectConfirm && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                    <span>Are you sure you want to reject this question? This action will notify the submitter.</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-line">
                <Button variant="outline" onClick={closeModal} className="py-2 text-xs">
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  {showRejectConfirm ? 'Confirm Rejection' : 'Reject Question'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Link to Existing Topic */}
        {activeModal === 'link_topic' && modalQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2 text-ink">
                  <Link2 className="h-5 w-5" />
                  <h3 className="font-serif text-lg font-bold">Approve & Link to Existing Topic</h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
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
                  <label htmlFor="select-topic" className="block text-xs font-semibold text-ink mb-1">
                    Select Target Topic
                  </label>
                  <select
                    id="select-topic"
                    value={selectedTopicSlug}
                    onChange={(e) => setSelectedTopicSlug(e.target.value)}
                    className="w-full rounded-lg border border-line bg-white p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {SEARCH_TOPICS.map((topic) => (
                      <option key={topic.slug} value={topic.slug}>
                        [{topic.category}] {topic.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-line">
                <Button variant="outline" onClick={closeModal} className="py-2 text-xs">
                  Cancel
                </Button>
                <Button onClick={handleConfirmLinkTopic} className="py-2 text-xs">
                  Approve & Link
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: Approve & Create New Topic */}
        {activeModal === 'create_topic' && modalQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
            <div className="w-full max-w-xl rounded-xl border border-line bg-white p-6 shadow-xl my-8">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2 text-ink">
                  <FolderPlus className="h-5 w-5" />
                  <h3 className="font-serif text-lg font-bold">Approve & Create New Topic</h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmCreateTopic} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="topic-title" className="block text-xs font-semibold text-ink mb-1">
                    Topic Title
                  </label>
                  <input
                    id="topic-title"
                    type="text"
                    required
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className="w-full rounded-lg border border-line p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
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
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="topic-category" className="block text-xs font-semibold text-ink mb-1">
                      Category
                    </label>
                    <select
                      id="topic-category"
                      value={newTopicCategory}
                      onChange={(e) => setNewTopicCategory(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {SEARCH_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="topic-tags" className="block text-xs font-semibold text-ink mb-1">
                      Tags (comma separated)
                    </label>
                    <input
                      id="topic-tags"
                      type="text"
                      value={newTopicTags}
                      onChange={(e) => setNewTopicTags(e.target.value)}
                      className="w-full rounded-lg border border-line p-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-line">
                  <Button variant="outline" type="button" onClick={closeModal} className="py-2 text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" className="py-2 text-xs">
                    Create Topic & Approve
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
