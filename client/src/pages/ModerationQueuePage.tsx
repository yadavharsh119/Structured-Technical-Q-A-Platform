import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  CheckCircle2,
  EyeOff,
  FileText,
  Flag,
  MessageSquare,
  User,
  X,
  XCircle,
} from 'lucide-react';
import type {
  ModerationReportReason,
  ReportAction,
  ReportStatus,
} from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { actOnReport, listReports } from '../api/reports';
import type { Report } from '../api/types';

type StatusFilter = 'all' | ReportStatus;

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
];

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const STATUS_BADGE: Record<ReportStatus, string> = {
  open: 'bg-amber-50 text-amber-800 border-amber-200',
  under_review: 'bg-blue-50 text-blue-800 border-blue-200',
  resolved: 'bg-green-50 text-green-800 border-green-200',
  dismissed: 'bg-tint text-muted border-line',
};

const REASON_LABELS: Record<ModerationReportReason, string> = {
  spam: 'Spam',
  abusive: 'Offensive / Abusive',
  duplicate: 'Duplicate',
  misleading: 'Misleading / Incorrect',
  plagiarism: 'Plagiarism',
  other: 'Other',
};

const ACTION_COPY: Record<
  ReportAction,
  { title: string; body: string; confirm: string }
> = {
  dismiss: {
    title: 'Dismiss report',
    body: 'This closes the report without changing the reported content. The report will be marked as dismissed.',
    confirm: 'Dismiss report',
  },
  hide: {
    title: 'Hide content',
    body: 'This removes the reported content from public view and marks the report as resolved.',
    confirm: 'Hide content',
  },
  escalate: {
    title: 'Escalate report',
    body: 'This flags the report for an administrator and marks it as under review.',
    confirm: 'Escalate report',
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function contentTitle(report: Report): string {
  if (!report.target) return 'Reported content unavailable';
  return report.target.type === 'topic'
    ? report.target.title
    : report.target.proposedSolution;
}

function isProcessed(status: ReportStatus): boolean {
  return status === 'resolved' || status === 'dismissed';
}

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function TargetTypeBadge({ type }: { type: Report['targetType'] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-tint px-2 py-0.5 text-xs font-semibold text-ink">
      {type === 'perspective' ? (
        <MessageSquare className="h-3 w-3" aria-hidden="true" />
      ) : (
        <FileText className="h-3 w-3" aria-hidden="true" />
      )}
      {type === 'perspective' ? 'Perspective' : 'Topic'}
    </span>
  );
}

export function ModerationQueuePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pendingAction, setPendingAction] = useState<{
    report: Report;
    action: ReportAction;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listReports().then((response) => {
      if (cancelled) return;
      if (response.success) {
        setReports(response.data.reports);
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
        ? reports
        : reports.filter((report) => report.status === statusFilter),
    [reports, statusFilter],
  );

  const countFor = (status: StatusFilter) =>
    status === 'all'
      ? reports.length
      : reports.filter((report) => report.status === status).length;

  const openCount = countFor('open');

  const closeActionDialog = () => {
    setPendingAction(null);
    setActionError(null);
    setActionLoading(false);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const { report, action } = pendingAction;
    setActionLoading(true);
    setActionError(null);

    const response = await actOnReport(report.id, action);
    setActionLoading(false);

    if (!response.success) {
      setActionError(response.error.message);
      return;
    }

    setReports((prev) =>
      prev.map((item) => (item.id === response.data.report.id ? response.data.report : item)),
    );
    const message =
      action === 'dismiss'
        ? `Report on "${contentTitle(report)}" dismissed.`
        : action === 'hide'
          ? `Content "${contentTitle(report)}" hidden and report resolved.`
          : `Report on "${contentTitle(report)}" escalated and marked under review.`;
    setSuccessBanner(message);
    closeActionDialog();
  };

  return (
    <PageShell>
      <div className="pb-28">
        <section aria-labelledby="moderation-heading" className="border-b border-line bg-white">
          <div className="mx-auto max-w-content px-6 py-10 md:py-14">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Admin Moderation
                  </span>
                  <span className="text-xs text-muted">Reports Queue</span>
                </div>
                <h1
                  id="moderation-heading"
                  className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[36px]"
                >
                  Moderation Queue
                </h1>
                <p className="mt-2 text-sm text-body">
                  Review reports against topics and perspectives. Dismiss, hide the content, or
                  escalate the report.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-tint/40 px-5 py-3 text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Open Reports
                </span>
                <p className="font-serif text-2xl font-bold text-ink">{openCount}</p>
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
                Loading reports...
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
                  aria-label="Filter reports by status"
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
                  {filtered.length === 1 ? 'report' : 'reports'}
                </p>

                {filtered.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-line bg-white p-12 text-center">
                    <Flag className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
                    <h2 className="mt-4 font-serif text-xl font-semibold text-ink">
                      No reports found
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                      There are no reports with this status.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-6 space-y-4">
                    {filtered.map((report) => {
                      const target = report.target;
                      const title = contentTitle(report);
                      const body = target
                        ? target.type === 'topic'
                          ? target.description
                          : target.explanation
                        : 'The reported content is no longer available.';
                      const processed = isProcessed(report.status);

                      return (
                        <li
                          key={report.id}
                          className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={report.status} />
                              <TargetTypeBadge type={report.targetType} />
                              {target?.hidden && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-line bg-tint px-2 py-0.5 text-xs font-medium text-muted">
                                  <EyeOff className="h-3 w-3" aria-hidden="true" />
                                  Hidden
                                </span>
                              )}
                            </div>
                            <time dateTime={report.createdAt} className="text-xs text-muted">
                              Reported {formatDate(report.createdAt)}
                            </time>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                              <h2 className="text-base font-semibold text-ink">{title}</h2>
                              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">
                                {body}
                              </p>
                              {target?.type === 'topic' ? (
                                <a
                                  href={`/topics/${target.slug}`}
                                  className="mt-2 inline-block text-sm font-medium text-ink underline hover:text-secondary"
                                >
                                  View topic
                                </a>
                              ) : target?.type === 'perspective' ? (
                                <p className="mt-2 text-xs text-muted">
                                  Perspective by{' '}
                                  <strong className="text-ink">@{target.authorUsername}</strong>
                                </p>
                              ) : null}
                            </div>

                            <div className="rounded-lg border border-line/60 bg-tint/20 p-4">
                              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                Report
                              </h3>
                              <p className="mt-2 text-sm font-semibold text-ink">
                                {REASON_LABELS[report.reason]}
                              </p>
                              <p className="mt-2 text-sm leading-relaxed text-body">
                                {report.comment ?? 'No comment provided.'}
                              </p>
                              <p className="mt-3 flex items-center gap-1 border-t border-line/60 pt-2 text-xs text-muted">
                                <User className="h-3 w-3" aria-hidden="true" />
                                Reported by{' '}
                                <strong className="text-ink">@{report.reporter.username}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
                            {processed ? (
                              <span className="text-xs text-muted">
                                This report has already been processed.
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingAction({ report, action: 'dismiss' })
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                                >
                                  <XCircle className="h-4 w-4" aria-hidden="true" />
                                  Dismiss
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingAction({ report, action: 'hide' })}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-tint"
                                >
                                  <EyeOff className="h-4 w-4 text-secondary" aria-hidden="true" />
                                  Hide
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingAction({ report, action: 'escalate' })
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black px-3.5 py-2 text-xs font-semibold text-white hover:bg-secondary"
                                >
                                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                  Escalate
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </section>

        {pendingAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="report-action-title"
              className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2
                  id="report-action-title"
                  className="font-serif text-lg font-bold text-ink"
                >
                  {ACTION_COPY[pendingAction.action].title}
                </h2>
                <button
                  type="button"
                  onClick={closeActionDialog}
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-body">
                {ACTION_COPY[pendingAction.action].body}
              </p>
              <p className="mt-3 rounded-lg border border-line bg-tint/30 p-3 text-sm font-semibold text-ink">
                {contentTitle(pendingAction.report)}
              </p>

              {pendingAction.action === 'hide' && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>The content author will no longer be able to show this content.</span>
                </div>
              )}

              {actionError && (
                <div
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  {actionError}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeActionDialog}
                  disabled={actionLoading}
                  className="py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={actionLoading}
                  className="py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading
                    ? 'Working...'
                    : ACTION_COPY[pendingAction.action].confirm}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default ModerationQueuePage;
