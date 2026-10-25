import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  CheckCircle2,
  EyeOff,
  FileText,
  Flag,
  MessageSquare,
  ShieldAlert,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { REPORT_REASONS, type ReportReason } from '@structured-qa/shared';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import {
  INITIAL_REPORTS,
  REPORT_STATUSES,
  type ContentReport,
  type ReportStatus,
} from '../data/mockReports';

const STATUS_BADGE: Record<ReportStatus, string> = {
  Open: 'bg-amber-50 text-amber-800 border-amber-200',
  'Under Review': 'bg-blue-50 text-blue-800 border-blue-200',
  Resolved: 'bg-green-50 text-green-800 border-green-200',
  Dismissed: 'bg-tint text-muted border-line',
};

const selectClass = 'h-11 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink';

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ContentTypeBadge({ type }: { type: ContentReport['contentType'] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-tint px-2 py-0.5 text-xs font-semibold text-ink">
      {type === 'Perspective' ? (
        <MessageSquare className="h-3 w-3" aria-hidden="true" />
      ) : (
        <FileText className="h-3 w-3" aria-hidden="true" />
      )}
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}
    >
      {status}
    </span>
  );
}

export function ModerationQueuePage() {
  const [reports, setReports] = useState<ContentReport[]>(INITIAL_REPORTS);
  const [statusFilter, setStatusFilter] = useState<'All' | ReportStatus>('All');
  const [reasonFilter, setReasonFilter] = useState<'All' | ReportReason>('All');
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_REPORTS[0]?.id ?? null);
  const [hideTarget, setHideTarget] = useState<ContentReport | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      reports.filter(
        (r) =>
          (statusFilter === 'All' || r.status === statusFilter) &&
          (reasonFilter === 'All' || r.reason === reasonFilter),
      ),
    [reports, statusFilter, reasonFilter],
  );

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;
  const openCount = reports.filter((r) => r.status === 'Open').length;
  const filtersActive = statusFilter !== 'All' || reasonFilter !== 'All';
  const isProcessed = selected?.status === 'Resolved' || selected?.status === 'Dismissed';

  const clearFilters = () => {
    setStatusFilter('All');
    setReasonFilter('All');
  };

  const updateReport = (id: string, patch: Partial<ContentReport>, message: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSuccessBanner(message);
  };

  const handleDismiss = (report: ContentReport) => {
    updateReport(
      report.id,
      { status: 'Dismissed' },
      `Report on "${report.contentTitle}" dismissed. No action was taken.`,
    );
  };

  const handleEscalate = (report: ContentReport) => {
    updateReport(
      report.id,
      { status: 'Under Review', escalated: true },
      `Report on "${report.contentTitle}" escalated to admin and marked Under Review.`,
    );
  };

  const handleConfirmHide = () => {
    if (!hideTarget) return;
    updateReport(
      hideTarget.id,
      { status: 'Resolved', hidden: true },
      `Content "${hideTarget.contentTitle}" hidden and report resolved. The author will be notified by email.`,
    );
    setHideTarget(null);
  };

  return (
    <PageShell>
      <div className="pb-28">
        {/* Header */}
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
                  Review reports against Topics and Perspectives. Dismiss, hide the content, or escalate to an admin.
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

        {/* Main content */}
        <section className="bg-canvas min-h-[500px]">
          <div className="mx-auto max-w-content px-6 py-8">
            {successBanner && (
              <div className="mb-6 flex items-center justify-between rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 shadow-xs">
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

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="status-filter" className="text-sm font-medium text-muted">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'All' | ReportStatus)}
                  className={selectClass}
                >
                  <option value="All">All statuses</option>
                  {REPORT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="reason-filter" className="text-sm font-medium text-muted">
                  Reason
                </label>
                <select
                  id="reason-filter"
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value as 'All' | ReportReason)}
                  className={selectClass}
                >
                  <option value="All">All reasons</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="pb-2.5 text-sm font-medium text-secondary underline hover:text-black"
                >
                  Clear filters
                </button>
              )}
            </div>

            <p aria-live="polite" className="mt-4 text-base text-body">
              <span className="font-semibold text-ink">{filtered.length} reports</span>
            </p>

            {filtered.length === 0 ? (
              /* Empty state */
              <div className="mt-6 rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <Flag className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
                <h2 className="mt-4 font-serif text-xl font-semibold text-ink">No reports found</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                  No reports match the selected filters. Try widening your search.
                </p>
                {filtersActive && (
                  <div className="mt-6">
                    <Button variant="outline" onClick={clearFilters} className="py-2 text-xs">
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Split view: list on the left, detail on the right */
              <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                {/* Left: report list */}
                <div className="space-y-3 lg:col-span-5">
                  <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-muted">
                    Reports ({filtered.length})
                  </h2>
                  <div className="space-y-3">
                    {filtered.map((r) => {
                      const isSelected = selected?.id === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedId(r.id)}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedId(r.id);
                            }
                          }}
                          className={`cursor-pointer rounded-xl border p-5 transition-all ${
                            isSelected
                              ? 'border-black bg-white shadow-md ring-1 ring-black'
                              : 'border-line bg-white hover:border-black/30 hover:bg-tint/20'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <ContentTypeBadge type={r.contentType} />
                            <span className="text-xs text-muted">{formatDate(r.reportedDate)}</span>
                          </div>

                          <h3 className="line-clamp-2 text-base font-semibold text-ink">
                            {r.contentTitle}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-xs text-body">{r.contentPreview}</p>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={r.status} />
                            <span className="rounded-md border border-line bg-white px-2 py-0.5 text-xs font-medium text-secondary">
                              {r.reason}
                            </span>
                            {r.autoFlagged && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-800">
                                <ShieldAlert className="h-3 w-3" aria-hidden="true" /> Auto-flagged
                              </span>
                            )}
                            {r.escalated && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                                <ArrowUp className="h-3 w-3" aria-hidden="true" /> Escalated
                              </span>
                            )}
                            {r.hidden && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-line bg-tint px-2 py-0.5 text-xs font-medium text-muted">
                                <EyeOff className="h-3 w-3" aria-hidden="true" /> Hidden
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-line/50 pt-2 text-xs text-muted">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> @{r.reporterName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Flag className="h-3 w-3" /> {r.reason}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: detail panel */}
                <div className="sticky top-24 lg:col-span-7">
                  {selected ? (
                    <div className="space-y-6 rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={selected.status} />
                          <ContentTypeBadge type={selected.contentType} />
                          {selected.autoFlagged && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-800">
                              <ShieldAlert className="h-3 w-3" aria-hidden="true" /> Auto-flagged
                            </span>
                          )}
                          {selected.escalated && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                              <ArrowUp className="h-3 w-3" aria-hidden="true" /> Escalated
                            </span>
                          )}
                          {selected.hidden && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-tint px-2 py-0.5 text-xs font-medium text-muted">
                              <EyeOff className="h-3 w-3" aria-hidden="true" /> Hidden
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted">
                          Reported on {formatDate(selected.reportedDate)} by{' '}
                          <strong className="text-ink">@{selected.reporterName}</strong>
                        </span>
                      </div>

                      <div>
                        <h2 className="font-serif text-xl font-bold text-ink">
                          {selected.contentTitle}
                        </h2>
                        <p className="mt-1 text-xs text-muted">
                          Reported content ({selected.contentType})
                        </p>
                        <div className="mt-4 whitespace-pre-line rounded-lg border border-line/60 bg-tint/20 p-4 text-sm leading-relaxed text-body">
                          {selected.contentBody}
                        </div>
                        <p className="mt-3 text-xs text-muted">
                          Content author: <strong className="text-ink">@{selected.contentAuthor}</strong>
                        </p>
                      </div>

                      <div className="border-t border-line pt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Report reason
                        </h3>
                        <p className="mt-2 text-sm font-semibold text-ink">{selected.reason}</p>
                        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
                          Reporter comments
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-body">
                          {selected.reporterComments}
                        </p>
                      </div>

                      <div className="space-y-3 border-t border-line pt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Moderation Actions
                        </h3>
                        {isProcessed ? (
                          <p className="rounded-lg border border-line bg-tint/40 p-3 text-xs text-muted">
                            This report has already been processed ({selected.status}).
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <button
                              type="button"
                              onClick={() => handleDismiss(selected)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                            >
                              <XCircle className="h-4 w-4" /> Dismiss
                            </button>

                            <button
                              type="button"
                              onClick={() => setHideTarget(selected)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-tint"
                            >
                              <EyeOff className="h-4 w-4 text-secondary" /> Hide Content
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEscalate(selected)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black px-3.5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-secondary"
                            >
                              <ArrowUp className="h-4 w-4" /> Escalate to Admin
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-line bg-white p-8 text-center text-muted">
                      Select a report from the queue to view details and perform moderation actions.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* MODAL: Hide Content confirmation */}
        {hideTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="hide-content-title"
              className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2 text-ink">
                  <EyeOff className="h-5 w-5" />
                  <h3 id="hide-content-title" className="font-serif text-lg font-bold">
                    Hide Content
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHideTarget(null)}
                  className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-muted">Content to hide:</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{hideTarget.contentTitle}</p>
                  <p className="mt-1 text-xs text-muted">
                    {hideTarget.contentType} by @{hideTarget.contentAuthor}
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-body">
                  Hiding this content removes it from public view and marks the report as Resolved.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>The author will be notified by email.</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-3">
                <Button variant="outline" onClick={() => setHideTarget(null)} className="py-2 text-xs">
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleConfirmHide}
                  className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-secondary"
                >
                  Confirm &amp; Hide
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default ModerationQueuePage;
