import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { DeletionRequestStatus } from '../api/types';
import type { DeletionRequest } from '../api/types';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { decideDeletionRequest, listDeletionRequests } from '../api/deletionRequests';

type StatusFilter = 'all' | DeletionRequestStatus;
type Decision = 'approve' | 'reject';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const STATUS_LABELS: Record<DeletionRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_BADGE: Record<DeletionRequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-green-50 text-green-800 border-green-200',
  rejected: 'bg-tint text-muted border-line',
};

const DECISION_COPY: Record<
  Decision,
  { title: string; body: string; confirm: string; className: string }
> = {
  approve: {
    title: 'Approve deletion request',
    body: 'This hides the perspective from all public lists, search and counts. The record stays in the database.',
    confirm: 'Approve and hide',
    className: 'bg-red-700 hover:bg-red-800',
  },
  reject: {
    title: 'Reject deletion request',
    body: 'The perspective stays visible. The author is not notified automatically.',
    confirm: 'Reject request',
    className: '',
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: DeletionRequestStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function DeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pendingDecision, setPendingDecision] = useState<{
    request: DeletionRequest;
    decision: Decision;
  } | null>(null);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDeletionRequests().then((response) => {
      if (cancelled) return;
      if (response.success) {
        setRequests(response.data.deletionRequests);
      } else {
        setLoadError(response.error.message);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? requests
        : requests.filter((request) => request.status === statusFilter),
    [requests, statusFilter],
  );

  const countFor = (status: StatusFilter) =>
    status === 'all'
      ? requests.length
      : requests.filter((request) => request.status === status).length;

  const pendingCount = countFor('pending');

  const closeDecisionDialog = () => {
    setPendingDecision(null);
    setNote('');
    setActionError(null);
    setActionLoading(false);
  };

  const handleConfirmDecision = async () => {
    if (!pendingDecision) return;
    const { request, decision } = pendingDecision;
    setActionLoading(true);
    setActionError(null);

    const response = await decideDeletionRequest(request.id, {
      decision,
      note: note.trim() || undefined,
    });
    setActionLoading(false);

    if (!response.success) {
      setActionError(response.error.message);
      return;
    }

    setRequests((prev) =>
      prev.map((item) =>
        item.id === response.data.deletionRequest.id ? response.data.deletionRequest : item,
      ),
    );
    setSuccessBanner(
      decision === 'approve'
        ? `Deletion request for "${request.perspective.proposedSolution}" approved.`
        : `Deletion request for "${request.perspective.proposedSolution}" rejected.`,
    );
    closeDecisionDialog();
  };

  return (
    <PageShell>
      <div className="pb-28">
        <section
          aria-labelledby="deletion-requests-heading"
          className="border-b border-line bg-white"
        >
          <div className="mx-auto max-w-content px-6 py-10 md:py-14">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Admin
                  </span>
                  <span className="text-xs text-muted">Perspective Removal</span>
                </div>
                <h1
                  id="deletion-requests-heading"
                  className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[36px]"
                >
                  Deletion Requests
                </h1>
                <p className="mt-2 text-sm text-body">
                  Review author requests to remove their perspectives. Approving hides the
                  perspective everywhere; rejecting keeps it public.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-tint/40 px-5 py-3 text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Pending Requests
                </span>
                <p className="font-serif text-2xl font-bold text-ink">{pendingCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="min-h-[500px] bg-canvas">
          <div className="mx-auto max-w-content px-6 py-8">
            {successBanner && (
              <div className="mb-6 flex items-center justify-between rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
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

            {isLoading ? (
              <div
                role="status"
                className="rounded-xl border border-line bg-white p-10 text-center text-sm text-muted"
              >
                Loading deletion requests...
              </div>
            ) : loadError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-800"
              >
                {loadError}
              </div>
            ) : (
              <>
                <div
                  role="tablist"
                  aria-label="Filter deletion requests by status"
                  className="flex flex-wrap gap-2 border-b border-line pb-3"
                >
                  {STATUS_TABS.map((tab) => {
                    const active = statusFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                          active
                            ? 'border-black bg-black text-white'
                            : 'border-line bg-white text-secondary hover:bg-tint hover:text-ink'
                        }`}
                      >
                        {tab.label}
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-xs ${
                            active ? 'bg-white/20 text-white' : 'bg-tint text-body'
                          }`}
                        >
                          {countFor(tab.id)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p aria-live="polite" className="mt-4 text-sm text-body">
                  <span className="font-semibold text-ink">{filtered.length}</span>{' '}
                  {filtered.length === 1 ? 'request' : 'requests'}
                </p>

                {filtered.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-line bg-white p-12 text-center">
                    <Trash2 className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
                    <h2 className="mt-4 font-serif text-xl font-semibold text-ink">
                      No deletion requests found
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                      There are no requests with this status.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-6 space-y-4">
                    {filtered.map((request) => {
                      const pending = request.status === 'pending';
                      return (
                        <li
                          key={request.id}
                          className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={request.status} />
                              {pending && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                                  <Clock className="h-3 w-3" aria-hidden="true" />
                                  Awaiting review
                                </span>
                              )}
                            </div>
                            <time dateTime={request.createdAt} className="text-xs text-muted">
                              Requested {formatDate(request.createdAt)}
                            </time>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                              <div className="flex items-start gap-2">
                                <MessageSquare
                                  className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                                  aria-hidden="true"
                                />
                                <div>
                                  <h2 className="text-base font-semibold text-ink">
                                    {request.perspective.proposedSolution}
                                  </h2>
                                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-body">
                                    {request.perspective.explanation}
                                  </p>
                                  <p className="mt-2 text-xs text-muted">
                                    Perspective by{' '}
                                    <strong className="text-ink">
                                      @{request.perspective.authorUsername}
                                    </strong>
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-lg border border-line/60 bg-tint/20 p-4">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                Request
                              </h3>
                              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">
                                {request.reason}
                              </p>
                              <p className="mt-3 flex items-center gap-1 border-t border-line/60 pt-2 text-xs text-muted">
                                <User className="h-3 w-3" aria-hidden="true" />
                                Requested by{' '}
                                <strong className="text-ink">@{request.requester.username}</strong>
                              </p>
                            </div>
                          </div>

                          {!pending && (
                            <div className="mt-4 rounded-lg border border-line bg-tint/20 p-4 text-sm text-body">
                              <p>
                                {request.status === 'approved'
                                  ? 'Approved'
                                  : 'Rejected'}
                                {request.decidedBy
                                  ? ` by @${request.decidedBy.username}`
                                  : ''}
                                {request.decidedAt
                                  ? ` on ${formatDate(request.decidedAt)}`
                                  : ''}
                                .
                              </p>
                              {request.decisionNote && (
                                <p className="mt-1 whitespace-pre-line text-muted">
                                  Note: {request.decisionNote}
                                </p>
                              )}
                            </div>
                          )}

                          {pending && (
                            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingDecision({ request, decision: 'reject' })
                                }
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-tint"
                              >
                                <X className="h-4 w-4 text-secondary" aria-hidden="true" />
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingDecision({ request, decision: 'approve' })
                                }
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-semibold text-white hover:bg-secondary"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Approve deletion
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </section>

        {pendingDecision && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="deletion-decision-title"
              className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2
                  id="deletion-decision-title"
                  className="font-serif text-lg font-bold text-ink"
                >
                  {DECISION_COPY[pendingDecision.decision].title}
                </h2>
                <button
                  type="button"
                  onClick={closeDecisionDialog}
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-body">
                {DECISION_COPY[pendingDecision.decision].body}
              </p>
              <p className="mt-3 rounded-lg border border-line bg-tint/30 p-3 text-sm font-semibold text-ink">
                {pendingDecision.request.perspective.proposedSolution}
              </p>

              <div className="mt-4">
                <label htmlFor="deletion-decision-note" className="text-sm font-medium text-ink">
                  Note <span className="text-muted">(optional)</span>
                </label>
                <textarea
                  id="deletion-decision-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Add a note for the audit log."
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
                />
              </div>

              {actionError && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDecisionDialog}
                  disabled={actionLoading}
                  className="py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDecision}
                  disabled={actionLoading}
                  className={`py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60 ${DECISION_COPY[pendingDecision.decision].className}`}
                >
                  {actionLoading
                    ? 'Working...'
                    : DECISION_COPY[pendingDecision.decision].confirm}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default DeletionRequestsPage;
