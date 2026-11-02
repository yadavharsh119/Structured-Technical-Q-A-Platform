import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Flag, X } from 'lucide-react';
import {
  MODERATION_REPORT_REASONS,
  type ModerationReportReason,
} from '@structured-qa/shared';
import { Button } from '../ui/Button';
import { createReport } from '../../api/reports';

const REASON_LABELS: Record<ModerationReportReason, string> = {
  spam: 'Spam',
  abusive: 'Offensive / Abusive',
  duplicate: 'Duplicate',
  misleading: 'Misleading / Incorrect',
  plagiarism: 'Plagiarism',
  other: 'Other',
};

interface ReportModalProps {
  targetType: 'topic' | 'perspective';
  targetId: string;
  targetLabel: string;
  onClose: () => void;
}

export function ReportModal({
  targetType,
  targetId,
  targetLabel,
  onClose,
}: ReportModalProps) {
  const [reason, setReason] = useState<ModerationReportReason | ''>('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    if (reason === 'other' && comment.trim().length === 0) {
      setError('A comment is required when the reason is "Other".');
      return;
    }

    setIsSubmitting(true);
    const response = await createReport({
      targetType,
      targetId,
      reason,
      comment: comment.trim() || undefined,
    });
    setIsSubmitting(false);

    if (!response.success) {
      if (response.error.code === 'REPORT_ALREADY_EXISTS') {
        setAlreadyReported(true);
        return;
      }
      setError(response.error.message);
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-ink">
            <Flag className="h-5 w-5" aria-hidden="true" />
            <h2 id="report-modal-title" className="font-serif text-lg font-bold">
              Report content
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close report dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-body">{targetLabel}</p>

        {submitted ? (
          <div className="mt-5">
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
              <p>
                Thanks. Your report has been submitted and will be reviewed by a moderator.
              </p>
            </div>
            <div className="mt-5 flex justify-end border-t border-line pt-3">
              <Button type="button" onClick={onClose} className="py-2 text-xs">
                Close
              </Button>
            </div>
          </div>
        ) : alreadyReported ? (
          <div className="mt-5">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
              <p>You have already reported this content.</p>
            </div>
            <div className="mt-5 flex justify-end border-t border-line pt-3">
              <Button type="button" onClick={onClose} className="py-2 text-xs">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="report-reason" className="text-sm font-medium text-ink">
                Reason
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as ModerationReportReason | '')
                }
                className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink"
              >
                <option value="">Select a reason</option>
                {MODERATION_REPORT_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {REASON_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="report-comment" className="text-sm font-medium text-ink">
                Comments
                {reason === 'other' && <span className="text-red-700"> (required)</span>}
              </label>
              <textarea
                id="report-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Add any context that will help moderators review this report."
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-muted">{comment.length}/1000</p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-line pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="py-2 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Submit report'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
